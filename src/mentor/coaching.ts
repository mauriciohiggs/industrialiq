export interface CoachingArea {
  name: string
  score: number
}

export interface CoachingCareer {
  name: string
  score: number | null
}

export interface CoachingResource {
  id: string
  name: string
  type: 'flashcards' | 'practice' | 'exam'
  quantity: number
  taskId: string
  estimatedReadinessGainPercent: number | null
}

export interface MentorCoachingInput {
  readiness: number | null
  competencies: CoachingArea[]
  careerReadiness: CoachingCareer[]
  weakAreas: CoachingArea[]
  targetLearningPath: string
  availableResources: CoachingResource[]
}

export interface CoachingAction {
  resourceId: string
  resourceName: string
  resourceType: CoachingResource['type']
  quantity: number
  taskId: string
  estimatedReadinessGainPercent: number | null
}

export interface MentorCoachingOutput {
  schemaVersion: '1.0.0'
  mode: 'provider' | 'template'
  strongestArea: CoachingArea | null
  largestGap: CoachingArea | null
  readinessPercent: number | null
  targetLearningPath: string
  actions: CoachingAction[]
  message: string
  guardrails: {
    usedOnlyProvidedResources: true
  }
}

interface ProviderSelection {
  strongestArea: CoachingArea | null
  largestGap: CoachingArea | null
  readinessPercent: number | null
  targetLearningPath: string
  actions: { resourceId: string; quantity: number }[]
}

export interface CoachingProvider {
  selectCoaching(
    input: MentorCoachingInput,
    responseSchema: Record<string, unknown>,
  ): Promise<Record<string, unknown>>
}

export class CoachingError extends Error {}

const responseSchema = {
  name: 'industrialiq_coaching_selection',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      strongestArea: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              score: { type: 'number' },
            },
            required: ['name', 'score'],
          },
          { type: 'null' },
        ],
      },
      largestGap: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              score: { type: 'number' },
            },
            required: ['name', 'score'],
          },
          { type: 'null' },
        ],
      },
      readinessPercent: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 100 },
          { type: 'null' },
        ],
      },
      targetLearningPath: { type: 'string' },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            resourceId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1 },
          },
          required: ['resourceId', 'quantity'],
        },
      },
    },
    required: [
      'strongestArea',
      'largestGap',
      'readinessPercent',
      'targetLearningPath',
      'actions',
    ],
  },
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === [...expected].sort()[index])
}

function validateArea(value: unknown, supplied: CoachingArea[], label: string): CoachingArea | null {
  if (value === null) return null
  if (!isRecord(value) || !exactKeys(value, ['name', 'score'])
    || typeof value.name !== 'string' || typeof value.score !== 'number') {
    throw new CoachingError(`Provider returned an invalid ${label}`)
  }
  const match = supplied.find((area) => area.name === value.name && area.score === value.score)
  if (!match) throw new CoachingError(`Provider changed the supplied ${label}`)
  return match
}

function validateSelection(
  value: Record<string, unknown>,
  input: MentorCoachingInput,
): ProviderSelection {
  if (!exactKeys(value, [
    'strongestArea',
    'largestGap',
    'readinessPercent',
    'targetLearningPath',
    'actions',
  ])) {
    throw new CoachingError('Provider output has missing or unexpected fields')
  }
  if (value.readinessPercent !== input.readiness) {
    throw new CoachingError('Provider changed the supplied readiness')
  }
  if (value.targetLearningPath !== input.targetLearningPath) {
    throw new CoachingError('Provider changed the supplied learning path')
  }
  if (!Array.isArray(value.actions)) {
    throw new CoachingError('Provider actions must be an array')
  }

  const resources = new Map(input.availableResources.map((resource) => [resource.id, resource]))
  const seen = new Set<string>()
  const actions = value.actions.map((action) => {
    if (!isRecord(action) || !exactKeys(action, ['resourceId', 'quantity'])
      || typeof action.resourceId !== 'string'
      || typeof action.quantity !== 'number'
      || !Number.isInteger(action.quantity)) {
      throw new CoachingError('Provider returned an invalid action')
    }
    const resource = resources.get(action.resourceId)
    if (!resource || seen.has(action.resourceId)
      || action.quantity < 1 || action.quantity > resource.quantity) {
      throw new CoachingError('Provider selected an unknown or invalid resource')
    }
    seen.add(action.resourceId)
    return { resourceId: action.resourceId, quantity: action.quantity }
  })

  return {
    strongestArea: validateArea(value.strongestArea, input.competencies, 'strongest area'),
    largestGap: validateArea(value.largestGap, input.weakAreas, 'largest gap'),
    readinessPercent: input.readiness,
    targetLearningPath: input.targetLearningPath,
    actions,
  }
}

function humanMessage(selection: ProviderSelection, resources: CoachingAction[]) {
  const sentences: string[] = []
  if (selection.strongestArea) {
    sentences.push(`Your strongest area is ${selection.strongestArea.name}.`)
  }
  if (selection.largestGap) {
    sentences.push(`${selection.largestGap.name} remains your largest gap.`)
  }
  for (const action of resources) {
    const unit = action.quantity === 1 ? action.resourceName : `${action.resourceName} (${action.quantity})`
    const gain = action.estimatedReadinessGainPercent === null
      ? ''
      : ` This is estimated to improve readiness by approximately ${action.estimatedReadinessGainPercent}%.`
    sentences.push(`Completing ${unit} is your next best step.${gain}`)
  }
  if (selection.readinessPercent === null) {
    sentences.push(`Your readiness for the ${selection.targetLearningPath} learning path is still being established.`)
  } else {
    sentences.push(`You are currently ${selection.readinessPercent}% prepared for the ${selection.targetLearningPath} learning path.`)
  }
  return sentences.join(' ')
}

function outputFromSelection(
  selection: ProviderSelection,
  input: MentorCoachingInput,
  mode: MentorCoachingOutput['mode'],
): MentorCoachingOutput {
  const resourceById = new Map(input.availableResources.map((resource) => [resource.id, resource]))
  const actions = selection.actions.map(({ resourceId, quantity }) => {
    const resource = resourceById.get(resourceId)!
    return {
      resourceId,
      resourceName: resource.name,
      resourceType: resource.type,
      quantity,
      taskId: resource.taskId,
      estimatedReadinessGainPercent: resource.estimatedReadinessGainPercent,
    }
  })
  return {
    schemaVersion: '1.0.0',
    mode,
    strongestArea: selection.strongestArea,
    largestGap: selection.largestGap,
    readinessPercent: selection.readinessPercent,
    targetLearningPath: selection.targetLearningPath,
    actions,
    message: humanMessage(selection, actions),
    guardrails: { usedOnlyProvidedResources: true },
  }
}

function templateSelection(input: MentorCoachingInput): ProviderSelection {
  const strongestArea = [...input.competencies]
    .sort((left, right) => right.score - left.score)[0] ?? null
  const largestGap = [...input.weakAreas]
    .sort((left, right) => right.score - left.score)[0] ?? null
  const matchingGapId = largestGap?.name.toLowerCase().replace(/\s+/g, '-')
  const resource = input.availableResources.find((item) => item.id.includes(matchingGapId ?? ''))
    ?? input.availableResources[0]
  return {
    strongestArea,
    largestGap,
    readinessPercent: input.readiness,
    targetLearningPath: input.targetLearningPath,
    actions: resource ? [{ resourceId: resource.id, quantity: resource.quantity }] : [],
  }
}

export class MentorCoachingService {
  private readonly provider?: CoachingProvider

  constructor(provider?: CoachingProvider) {
    this.provider = provider
  }

  template(input: MentorCoachingInput) {
    return outputFromSelection(templateSelection(input), input, 'template')
  }

  async coach(input: MentorCoachingInput): Promise<MentorCoachingOutput> {
    const fallback = this.template(input)
    if (!this.provider) return fallback
    try {
      const raw = await this.provider.selectCoaching(input, responseSchema)
      return outputFromSelection(validateSelection(raw, input), input, 'provider')
    } catch (error) {
      if (!(error instanceof CoachingError)) throw error
      console.warn('IndustrialIQ mentor provider failed; using template coaching.', error)
      return fallback
    }
  }
}

export interface OpenAICompatibleProviderOptions {
  baseUrl: string
  apiKey?: string
  model: string
  timeoutMs?: number
}

export class OpenAICompatibleCoachingProvider implements CoachingProvider {
  private readonly options: OpenAICompatibleProviderOptions

  constructor(options: OpenAICompatibleProviderOptions) {
    this.options = options
  }

  async selectCoaching(
    input: MentorCoachingInput,
    responseSchema: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000)
    const endpoint = this.options.baseUrl.endsWith('/chat/completions')
      ? this.options.baseUrl
      : `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: 'You are the IndustrialIQ AI Mentor. Return only the requested strict JSON. Select facts and resource IDs only from the supplied input. Do not invent resources, scores, paths, gains, or prose.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                dashboard: input,
                instructions: {
                  strongestArea: 'Choose exactly one supplied competency.',
                  largestGap: 'Choose exactly one supplied weak area.',
                  actions: 'Use only supplied resource IDs and do not exceed each quantity.',
                  message: 'The application composes human coaching after this structured selection.',
                },
              }),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: responseSchema,
          },
        }),
      })
      if (!response.ok) {
        throw new CoachingError(`OpenAI-compatible provider returned HTTP ${response.status}`)
      }
      const envelope: unknown = await response.json()
      if (!isRecord(envelope) || !Array.isArray(envelope.choices)) {
        throw new CoachingError('OpenAI-compatible provider returned an invalid envelope')
      }
      const choice = envelope.choices[0]
      if (!isRecord(choice) || !isRecord(choice.message) || typeof choice.message.content !== 'string') {
        throw new CoachingError('OpenAI-compatible provider returned an invalid completion')
      }
      const parsed: unknown = JSON.parse(choice.message.content)
      if (!isRecord(parsed)) throw new CoachingError('Provider content must be a JSON object')
      return parsed
    } catch (error) {
      if (error instanceof CoachingError) throw error
      throw new CoachingError(
        `OpenAI-compatible provider failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function configuredMentorCoachingService() {
  const baseUrl = import.meta.env.VITE_MENTOR_API_BASE_URL
    || import.meta.env.VITE_OPENAI_BASE_URL
  if (!baseUrl) return new MentorCoachingService()
  const provider = new OpenAICompatibleCoachingProvider({
    baseUrl,
    apiKey: import.meta.env.VITE_MENTOR_API_KEY
      || import.meta.env.VITE_OPENAI_API_KEY,
    model: import.meta.env.VITE_MENTOR_MODEL
      || import.meta.env.VITE_OPENAI_MODEL
      || 'gpt-4o-mini',
  })
  return new MentorCoachingService(provider)
}
