import { categorySkillIds, industrialGraph } from './analytics/industrialGraph'
import type {
  DiagnosticAnswer,
  DiagnosticConfiguration,
  DiagnosticDifficulty,
  DiagnosticGraph,
  DiagnosticQuestion,
  DiagnosticQuestionSource,
  DiagnosticSession,
  PresentedDiagnosticQuestion,
} from './diagnosticModels'

export const DEFAULT_DIAGNOSTIC_CONFIGURATION: DiagnosticConfiguration = {
  minQuestions: 10,
  maxQuestions: 12,
  targetCoverage: 0.9,
  initialDifficulty: 2,
  estimatedMinutesGoal: 5,
  targetScore: 80,
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const round = (value: number) => Math.round(value * 10) / 10

function validateConfiguration(config: DiagnosticConfiguration) {
  if (!Number.isInteger(config.minQuestions) || !Number.isInteger(config.maxQuestions) ||
    config.minQuestions < 10 || config.maxQuestions > 20 || config.maxQuestions < config.minQuestions) {
    throw new Error('A diagnostic must contain between 10 and 20 questions, in a valid range.')
  }
  if (!Number.isFinite(config.targetCoverage) || config.targetCoverage < 0 || config.targetCoverage > 1 ||
    !Number.isFinite(config.estimatedMinutesGoal) || config.estimatedMinutesGoal <= 0 ||
    !Number.isFinite(config.targetScore) || config.targetScore < 0 || config.targetScore > 100 ||
    !Number.isInteger(config.initialDifficulty) || config.initialDifficulty < 1 || config.initialDifficulty > 5) {
    throw new Error('Diagnostic configuration is invalid.')
  }
}

function validateQuestions(questions: DiagnosticQuestion[]) {
  if (!questions.length) throw new Error('The diagnostic question bank cannot be empty.')
  const ids = new Set<string>()
  for (const question of questions) {
    if (!question.id || ids.has(question.id) || !question.prompt.trim() || question.options.length < 2 ||
      !Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length || !Number.isInteger(question.difficulty) ||
      question.difficulty < 1 || question.difficulty > 5 || question.skillIds.length === 0 ||
      question.competencyIds.length === 0 || !Number.isFinite(question.estimatedSeconds) ||
      question.estimatedSeconds <= 0) {
      throw new Error(`Invalid diagnostic question: ${question.id || 'unknown'}`)
    }
    ids.add(question.id)
  }
}

function validateQuestionMappings(questions: DiagnosticQuestion[], graph: DiagnosticGraph) {
  const skillIds = new Set(graph.skills.map(({ id }) => id))
  const competencyIds = new Set(graph.competencies.map(({ id }) => id))
  for (const question of questions) {
    if (question.skillIds.some((id) => !skillIds.has(id)) ||
      question.competencyIds.some((id) => !competencyIds.has(id))) {
      throw new Error(`Question ${question.id} has an invalid competency mapping.`)
    }
  }
}

export function validateDiagnosticGraph(graph: DiagnosticGraph) {
  const skillIds = new Set(graph.skills.map(({ id }) => id))
  const competencyIds = new Set(graph.competencies.map(({ id }) => id))
  if (skillIds.size !== graph.skills.length || competencyIds.size !== graph.competencies.length) {
    throw new Error('Diagnostic graph IDs must be unique within each entity type.')
  }
  for (const competency of graph.competencies) {
    if (!competency.skillIds.length || new Set(competency.skillIds).size !== competency.skillIds.length ||
      competency.skillIds.some((id) => !skillIds.has(id))) {
      throw new Error(`Invalid diagnostic competency mapping: ${competency.id}`)
    }
  }
  for (const skill of graph.skills) {
    if (!skill.competencyIds.length || new Set(skill.competencyIds).size !== skill.competencyIds.length ||
      skill.competencyIds.some((id) => !competencyIds.has(id))) {
      throw new Error(`Invalid diagnostic skill mapping: ${skill.id}`)
    }
  }
}

function inferDifficulty(question: DiagnosticQuestionSource): DiagnosticDifficulty {
  const suffix = Number.parseInt(question.id.match(/(\d+)$/)?.[1] ?? '1', 10)
  return clamp(Math.ceil((suffix || 1) / 2), 1, 4) as DiagnosticDifficulty
}

export function toDiagnosticQuestions(
  sources: DiagnosticQuestionSource[],
  graph: DiagnosticGraph,
  categorySkills: Record<string, string> = {},
): DiagnosticQuestion[] {
  validateDiagnosticGraph(graph)
  const questions = sources.map((source) => {
    const inferredSkillId = source.category ? categorySkills[source.category] : undefined
    const skillIds = source.skillIds?.length ? source.skillIds : inferredSkillId ? [inferredSkillId] : []
    const knownSkills = new Set(graph.skills.map(({ id }) => id))
    if (skillIds.some((id) => !knownSkills.has(id))) {
      throw new Error(`Question ${source.id} references an unknown skill.`)
    }
    const competencyIds = source.competencyIds?.length
      ? source.competencyIds
      : [...new Set(skillIds.flatMap((skillId) =>
        graph.skills.find(({ id }) => id === skillId)?.competencyIds ?? []))]
    return {
      id: source.id,
      prompt: source.question,
      options: [...source.options],
      correctOptionIndex: source.correct,
      skillIds: [...skillIds],
      competencyIds,
      difficulty: source.difficulty ?? inferDifficulty(source),
      estimatedSeconds: source.estimatedSeconds ?? 25,
    }
  })
  validateQuestions(questions)
  return questions
}

export const industrialDiagnosticGraph: DiagnosticGraph = {
  skills: industrialGraph.skills.map(({ id }) => ({
    id,
    name: id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '),
    competencyIds: industrialGraph.competencies.filter((competency) =>
      competency.skills.some(({ skillId }) => skillId === id)).map(({ id: competencyId }) => competencyId),
  })),
  competencies: industrialGraph.competencies.map((competency) => ({
    id: competency.id,
    name: competency.id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '),
    skillIds: competency.skills.map(({ skillId }) => skillId),
    targetScore: competency.minimumTarget,
  })),
}

export function createIndustrialDiagnosticQuestions(sources: DiagnosticQuestionSource[]): DiagnosticQuestion[] {
  return toDiagnosticQuestions(sources, industrialDiagnosticGraph, categorySkillIds)
}

function questionCount(score: number, count: number) {
  return score / Math.max(1, count)
}

export function shouldCompleteDiagnostic(
  session: DiagnosticSession,
  graph: DiagnosticGraph,
  configuration: Partial<DiagnosticConfiguration> = {},
): boolean {
  const config = { ...DEFAULT_DIAGNOSTIC_CONFIGURATION, ...configuration }
  validateConfiguration(config)
  if (session.answers.length >= config.maxQuestions) return true
  if (session.answers.length < config.minQuestions) return false
  const assessedSkills = new Set(session.answers.flatMap((answer) => answer.skillIds))
  const coverage = graph.skills.length ? assessedSkills.size / graph.skills.length : 0
  return coverage >= config.targetCoverage
}

export function startDiagnosticSession(userId: string, startedAt: number = Date.now()): DiagnosticSession {
  if (!userId.trim() || !Number.isFinite(startedAt)) throw new Error('A user ID and valid start time are required.')
  return {
    version: 1,
    id: `diagnostic-${startedAt}-${Math.random().toString(36).slice(2, 10)}`,
    userId,
    startedAt,
    completedAt: null,
    abilityEstimate: DEFAULT_DIAGNOSTIC_CONFIGURATION.initialDifficulty,
    answers: [],
    presentedQuestionIds: [],
    currentQuestionId: null,
  }
}

export function selectAdaptiveQuestion(
  session: DiagnosticSession,
  questions: DiagnosticQuestion[],
): DiagnosticQuestion | null {
  validateQuestions(questions)
  if (session.completedAt !== null || session.currentQuestionId !== null) return null
  const available = questions.filter((question) => !session.presentedQuestionIds.includes(question.id))
  if (!available.length) return null

  const evidenceBySkill = new Map<string, { attempts: number; correct: number }>()
  for (const answer of session.answers) {
    for (const skillId of answer.skillIds) {
      const current = evidenceBySkill.get(skillId) ?? { attempts: 0, correct: 0 }
      current.attempts += 1
      current.correct += answer.correct ? 1 : 0
      evidenceBySkill.set(skillId, current)
    }
  }
  const ranked = available.map((question) => {
    const skillEvidence = question.skillIds.map((skillId) =>
      evidenceBySkill.get(skillId) ?? { attempts: 0, correct: 0 })
    const unexploredCount = skillEvidence.filter(({ attempts }) => attempts === 0).length
    const weakestAccuracy = Math.min(...skillEvidence.map(({ attempts, correct }) =>
      attempts ? questionCount(correct, attempts) : 0))
    const difficultyDistance = Math.abs(question.difficulty - session.abilityEstimate)
    const multiSkillBonus = Math.max(0, question.skillIds.length - 1) * 0.05
    const priority = unexploredCount * 3 - weakestAccuracy - difficultyDistance * 0.45 + multiSkillBonus
    return { question, priority }
  }).sort((a, b) => b.priority - a.priority || a.question.id.localeCompare(b.question.id))
  return ranked[0]?.question ?? null
}

export function presentNextDiagnosticQuestion(
  session: DiagnosticSession,
  questions: DiagnosticQuestion[],
): PresentedDiagnosticQuestion | null {
  const question = selectAdaptiveQuestion(session, questions)
  if (!question) return null
  return {
    question,
    session: {
      ...session,
      presentedQuestionIds: [...session.presentedQuestionIds, question.id],
      currentQuestionId: question.id,
    },
  }
}

export function answerDiagnosticQuestion(
  session: DiagnosticSession,
  questions: DiagnosticQuestion[],
  selectedOptionIndex: number,
  answeredAt: number = Date.now(),
): DiagnosticSession {
  validateQuestions(questions)
  if (session.completedAt !== null || session.currentQuestionId === null) {
    throw new Error('No diagnostic question is currently awaiting an answer.')
  }
  const question = questions.find(({ id }) => id === session.currentQuestionId)
  if (!question) throw new Error(`The active diagnostic question is missing: ${session.currentQuestionId}`)
  if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0 ||
    selectedOptionIndex >= question.options.length || !Number.isFinite(answeredAt) ||
    answeredAt < (session.answers.at(-1)?.answeredAt ?? session.startedAt)) {
    throw new Error('The diagnostic answer is invalid.')
  }
  const correct = selectedOptionIndex === question.correctOptionIndex
  const previousAnsweredAt = session.answers.at(-1)?.answeredAt ?? session.startedAt
  const answer: DiagnosticAnswer = {
    questionId: question.id,
    selectedOptionIndex,
    correct,
    difficulty: question.difficulty,
    skillIds: [...question.skillIds],
    competencyIds: [...question.competencyIds],
    answeredAt,
    durationSeconds: round(Math.max(0, (answeredAt - previousAnsweredAt) / 1000)),
  }
  return {
    ...session,
    answers: [...session.answers, answer],
    currentQuestionId: null,
    abilityEstimate: round(clamp(
      session.abilityEstimate + (correct ? 0.45 : -0.5) +
        (correct ? (question.difficulty - session.abilityEstimate) * 0.12 :
          (question.difficulty - session.abilityEstimate) * 0.04),
      1,
      5,
    )),
  }
}

export function completeDiagnosticSession(
  session: DiagnosticSession,
  completedAt: number = Date.now(),
  minimumQuestions: number = DEFAULT_DIAGNOSTIC_CONFIGURATION.minQuestions,
): DiagnosticSession {
  if (session.currentQuestionId !== null) throw new Error('Answer the active question before completing the diagnostic.')
  if (!Number.isInteger(minimumQuestions) || minimumQuestions < 10 || minimumQuestions > 20) {
    throw new Error('The minimum diagnostic question count is invalid.')
  }
  if (session.answers.length < minimumQuestions) {
    throw new Error(`A diagnostic requires at least ${minimumQuestions} answered questions.`)
  }
  if (!Number.isFinite(completedAt) || completedAt < session.startedAt) {
    throw new Error('The diagnostic completion time is invalid.')
  }
  return { ...session, completedAt }
}

export class DiagnosticEngine {
  readonly questions: DiagnosticQuestion[]
  readonly graph: DiagnosticGraph
  readonly configuration: DiagnosticConfiguration

  constructor(
    questions: DiagnosticQuestion[],
    graph: DiagnosticGraph,
    configuration: Partial<DiagnosticConfiguration> = {},
  ) {
    validateDiagnosticGraph(graph)
    validateQuestions(questions)
    validateQuestionMappings(questions, graph)
    this.configuration = { ...DEFAULT_DIAGNOSTIC_CONFIGURATION, ...configuration }
    validateConfiguration(this.configuration)
    this.questions = questions
    this.graph = graph
  }

  start(userId: string, startedAt?: number): DiagnosticSession {
    const session = startDiagnosticSession(userId, startedAt)
    return { ...session, abilityEstimate: this.configuration.initialDifficulty }
  }

  next(session: DiagnosticSession): PresentedDiagnosticQuestion | null {
    if (shouldCompleteDiagnostic(session, this.graph, this.configuration)) {
      return null
    }
    return presentNextDiagnosticQuestion(session, this.questions)
  }

  answer(session: DiagnosticSession, selectedOptionIndex: number, answeredAt?: number): DiagnosticSession {
    return answerDiagnosticQuestion(session, this.questions, selectedOptionIndex, answeredAt)
  }

  complete(session: DiagnosticSession, completedAt?: number): DiagnosticSession {
    return completeDiagnosticSession(session, completedAt, this.configuration.minQuestions)
  }
}
