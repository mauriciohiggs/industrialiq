import type {
  BranchCondition,
  CompetencyImpact,
  DecisionRecord,
  DecisionResult,
  ScenarioNode,
  SimulationScenario,
  SimulationScoringPolicy,
  SimulationSession,
  SimulationSummary,
  StartSimulationOptions,
} from './simulationModels'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export interface SimulationEngineOptions {
  clock?: () => number
  scoringPolicy?: SimulationScoringPolicy
  minimumScore?: number
  maximumScore?: number
}

export const defaultScoringPolicy: SimulationScoringPolicy = {
  score: ({ choice }) => ({
    points: choice.points,
    competencyImpacts: choice.competencyImpacts ?? [],
  }),
}

function finite(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`)
  }
}

function uniqueIds<T extends { id: string }>(items: T[], label: string) {
  const ids = items.map(({ id }) => id)
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error(`${label} IDs must be non-empty and unique.`)
  }
}

function validateCondition(
  condition: BranchCondition,
  competencyIds: Set<string>,
  label: string,
): void {
  if ('all' in condition) {
    if (!condition.all.length) throw new Error(`${label} "all" condition cannot be empty.`)
    condition.all.forEach((item) => validateCondition(item, competencyIds, label))
    return
  }
  if ('any' in condition) {
    if (!condition.any.length) throw new Error(`${label} "any" condition cannot be empty.`)
    condition.any.forEach((item) => validateCondition(item, competencyIds, label))
    return
  }
  if ('not' in condition) {
    validateCondition(condition.not, competencyIds, label)
    return
  }
  if (condition.field === 'competency') {
    if (!competencyIds.has(condition.competencyId)) {
      throw new Error(`${label} references an unknown competency: ${condition.competencyId}`)
    }
    finite(condition.value, `${label} condition value`)
    return
  }
  if (condition.field === 'score') {
    finite(condition.value, `${label} condition value`)
  }
}

function validateImpacts(impacts: CompetencyImpact[], competencyIds: Set<string>, label: string) {
  const impactedCompetencies = new Set<string>()
  for (const impact of impacts) {
    if (!competencyIds.has(impact.competencyId)) {
      throw new Error(`${label} references an unknown competency: ${impact.competencyId}`)
    }
    if (impactedCompetencies.has(impact.competencyId)) {
      throw new Error(`${label} contains duplicate competency impacts: ${impact.competencyId}`)
    }
    impactedCompetencies.add(impact.competencyId)
    finite(impact.delta, `${label} competency delta`)
  }
}

export function validateScenario(scenario: SimulationScenario): void {
  if (!scenario.id.trim()) throw new Error('Scenario ID must be non-empty.')
  if (!Number.isInteger(scenario.schemaVersion) || scenario.schemaVersion < 1) {
    throw new Error('Scenario schema version must be a positive integer.')
  }
  uniqueIds(scenario.competencies, 'Competency')
  uniqueIds(scenario.nodes, 'Node')

  const nodeIds = new Set(scenario.nodes.map(({ id }) => id))
  const competencyIds = new Set(scenario.competencies.map(({ id }) => id))
  if (!nodeIds.has(scenario.startNodeId)) {
    throw new Error(`Unknown scenario start node: ${scenario.startNodeId}`)
  }

  const choiceIds = new Set<string>()
  const decisionConditions: { choiceId: string; label: string }[] = []
  for (const node of scenario.nodes) {
    if (!node.title.trim() || !node.content.trim()) {
      throw new Error(`Node ${node.id} must have a title and content.`)
    }
    if (node.competencyIds?.some((id) => !competencyIds.has(id))) {
      throw new Error(`Node ${node.id} references an unknown competency.`)
    }
    const choices = node.choices ?? []
    if (node.kind === 'decision' && choices.length === 0) {
      throw new Error(`Decision node ${node.id} requires at least one choice.`)
    }
    if (node.kind === 'outcome' && choices.length > 0) {
      throw new Error(`Outcome node ${node.id} cannot contain choices.`)
    }

    for (const choice of choices) {
      if (!choice.id.trim() || choiceIds.has(choice.id)) {
        throw new Error('Choice IDs must be non-empty and unique across a scenario.')
      }
      choiceIds.add(choice.id)
      if (!choice.label.trim()) throw new Error(`Choice ${choice.id} must have a label.`)
      finite(choice.points, `Choice ${choice.id} points`)
      validateImpacts(choice.competencyImpacts ?? [], competencyIds, `Choice ${choice.id}`)

      const targets = [choice.nextNodeId, ...(choice.branches?.map(({ nextNodeId }) => nextNodeId) ?? [])]
      for (const target of targets) {
        if (!nodeIds.has(target)) {
          throw new Error(`Choice ${choice.id} targets an unknown node: ${target}`)
        }
      }
      for (const branch of choice.branches ?? []) {
        validateCondition(branch.when, competencyIds, `Choice ${choice.id} branch`)
        collectDecisionConditions(branch.when, `Choice ${choice.id} branch`, decisionConditions)
      }
    }
  }

  for (const { choiceId, label } of decisionConditions) {
    if (!choiceIds.has(choiceId)) {
      throw new Error(`${label} references an unknown choice: ${choiceId}`)
    }
  }

  if (scenario.nodes.find(({ id }) => id === scenario.startNodeId)?.kind !== 'decision' &&
    scenario.nodes.length > 1) {
    throw new Error('A scenario with multiple nodes cannot start at an outcome node.')
  }
}

function collectDecisionConditions(
  condition: BranchCondition,
  label: string,
  references: { choiceId: string; label: string }[],
): void {
  if ('all' in condition) {
    condition.all.forEach((item) => collectDecisionConditions(item, label, references))
  } else if ('any' in condition) {
    condition.any.forEach((item) => collectDecisionConditions(item, label, references))
  } else if ('not' in condition) {
    collectDecisionConditions(condition.not, label, references)
  } else if (condition.field === 'decision') {
    references.push({ choiceId: condition.choiceId, label })
  }
}

function compare(actual: number, operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte', expected: number) {
  switch (operator) {
    case 'eq': return actual === expected
    case 'ne': return actual !== expected
    case 'gt': return actual > expected
    case 'gte': return actual >= expected
    case 'lt': return actual < expected
    case 'lte': return actual <= expected
  }
}

function matchesCondition(condition: BranchCondition, session: SimulationSession): boolean {
  if ('all' in condition) return condition.all.every((item) => matchesCondition(item, session))
  if ('any' in condition) return condition.any.some((item) => matchesCondition(item, session))
  if ('not' in condition) return !matchesCondition(condition.not, session)
  if (condition.field === 'score') return compare(session.score, condition.operator, condition.value)
  if (condition.field === 'competency') {
    return compare(session.competencyScores[condition.competencyId] ?? 0, condition.operator, condition.value)
  }
  if (condition.field === 'flag') return (session.flags[condition.flag] ?? false) === condition.value
  const occurred = session.decisions.some(({ choiceId }) => choiceId === condition.choiceId)
  return occurred === condition.occurred
}

export class SimulationEngine {
  readonly scenario: SimulationScenario
  private readonly nodesById: Map<string, ScenarioNode>
  private readonly competencyIds: string[]
  private readonly clock: () => number
  private readonly scoringPolicy: SimulationScoringPolicy
  private readonly minimumScore: number
  private readonly maximumScore: number

  constructor(
    scenario: SimulationScenario,
    options: SimulationEngineOptions = {},
  ) {
    validateScenario(scenario)
    this.scenario = scenario
    this.nodesById = new Map(scenario.nodes.map((node) => [node.id, node]))
    this.competencyIds = scenario.competencies.map(({ id }) => id)
    this.clock = options.clock ?? Date.now
    this.scoringPolicy = options.scoringPolicy ?? defaultScoringPolicy
    this.minimumScore = options.minimumScore ?? Number.NEGATIVE_INFINITY
    this.maximumScore = options.maximumScore ?? Number.POSITIVE_INFINITY
    if (this.minimumScore > this.maximumScore) {
      throw new Error('Minimum score cannot exceed maximum score.')
    }
  }

  start(options: StartSimulationOptions): SimulationSession {
    if (!options.attemptId.trim()) throw new Error('Attempt ID must be non-empty.')
    const now = this.clock()
    finite(now, 'Simulation time')
    const competencyScores: Record<string, number> = {}
    for (const competencyId of this.competencyIds) {
      const score = options.competencyScores?.[competencyId] ?? 0
      finite(score, `Initial score for ${competencyId}`)
      competencyScores[competencyId] = clamp(score, 0, 100)
    }
    const startNode = this.nodesById.get(this.scenario.startNodeId)!
    return {
      scenarioId: this.scenario.id,
      schemaVersion: this.scenario.schemaVersion,
      attemptId: options.attemptId,
      status: startNode.kind === 'outcome' ? 'completed' : 'active',
      currentNodeId: startNode.id,
      score: 0,
      competencyScores,
      flags: { ...options.flags },
      decisions: [],
      startedAt: now,
      completedAt: startNode.kind === 'outcome' ? now : null,
    }
  }

  currentNode(session: SimulationSession): ScenarioNode {
    this.validateSession(session)
    return this.nodesById.get(session.currentNodeId)!
  }

  decide(session: SimulationSession, choiceId: string): DecisionResult {
    this.validateSession(session)
    if (session.status !== 'active') throw new Error('Cannot decide in a completed simulation.')
    const node = this.nodesById.get(session.currentNodeId)!
    const choice = node.choices?.find(({ id }) => id === choiceId)
    if (!choice) throw new Error(`Unknown choice ${choiceId} for node ${node.id}.`)

    const now = this.clock()
    finite(now, 'Simulation time')
    if (now < session.startedAt) throw new Error('Simulation time cannot precede session start.')
    const scored = this.scoringPolicy.score({
      scenario: this.scenario,
      session,
      node,
      choice,
    })
    finite(scored.points, `Scored points for choice ${choice.id}`)
    validateImpacts(scored.competencyImpacts, new Set(this.competencyIds), `Choice ${choice.id} result`)

    const provisional: SimulationSession = {
      ...session,
      score: clamp(session.score + scored.points, this.minimumScore, this.maximumScore),
      competencyScores: { ...session.competencyScores },
      flags: { ...session.flags, ...choice.flags },
      decisions: [...session.decisions],
    }
    const competencyUpdates = scored.competencyImpacts.map((impact) => {
      const previousScore = session.competencyScores[impact.competencyId] ?? 0
      const score = clamp(previousScore + impact.delta, 0, 100)
      provisional.competencyScores[impact.competencyId] = score
      return {
        competencyId: impact.competencyId,
        previousScore,
        score,
        delta: score - previousScore,
        reason: impact.reason,
      }
    })

    const branch = choice.branches?.find(({ when }) => matchesCondition(when, provisional))
    const nextNodeId = branch?.nextNodeId ?? choice.nextNodeId
    const completed = this.nodesById.get(nextNodeId)!.kind === 'outcome'
    const decision: DecisionRecord = {
      id: `${session.attemptId}:${session.decisions.length + 1}`,
      nodeId: node.id,
      choiceId: choice.id,
      choiceLabel: choice.label,
      at: now,
      pointsAwarded: provisional.score - session.score,
      competencyUpdates,
      nextNodeId,
    }
    provisional.currentNodeId = nextNodeId
    provisional.status = completed ? 'completed' : 'active'
    provisional.completedAt = completed ? now : null
    provisional.decisions.push(decision)

    return {
      session: provisional,
      decision,
      completed,
      feedback: choice.feedback,
    }
  }

  summarize(session: SimulationSession): SimulationSummary {
    this.validateSession(session)
    if (session.status !== 'completed' || session.completedAt === null) {
      throw new Error('Only completed simulations can be summarized.')
    }
    return {
      scenarioId: session.scenarioId,
      attemptId: session.attemptId,
      score: session.score,
      decisionCount: session.decisions.length,
      competencyScores: { ...session.competencyScores },
      completedAt: session.completedAt,
    }
  }

  private validateSession(session: SimulationSession) {
    if (session.scenarioId !== this.scenario.id || session.schemaVersion !== this.scenario.schemaVersion) {
      throw new Error('Session does not belong to this scenario version.')
    }
    if (!this.nodesById.has(session.currentNodeId)) {
      throw new Error(`Session references an unknown node: ${session.currentNodeId}`)
    }
    finite(session.score, 'Session score')
    for (const competencyId of this.competencyIds) {
      finite(session.competencyScores[competencyId], `Session score for ${competencyId}`)
    }
  }
}

export function createSimulationEngine(
  scenario: SimulationScenario,
  options?: SimulationEngineOptions,
): SimulationEngine {
  return new SimulationEngine(scenario, options)
}
