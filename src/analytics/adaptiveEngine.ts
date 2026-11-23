import { DAY } from '../lib/study'

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy'
export type AdaptiveActionType =
  | 'diagnostic_exam'
  | 'study_module'
  | 'flashcard_review'
  | 'practice_question'
  | 'mock_exam'
  | 'certify'

export interface AdaptiveCompetency {
  id: string
  name?: string
  skillIds?: string[]
  skills?: { skillId: string; weight: number }[]
  moduleIds?: string[]
  targetMastery?: number
  minimumTarget?: number
  weight?: number
}

export interface AdaptiveQuestion {
  id: string
  question?: string
  category?: string
  competencyIds?: string[]
  skillIds?: string[]
  moduleId?: string
  difficulty?: number
}

export interface AdaptiveQuestionHistory {
  questionId: string
  correct: boolean
  at: number
  difficulty?: number
}

export interface AdaptiveFlashcard {
  questionId: string
  rating: FlashcardRating
  due?: number
  interval?: number
  reviews?: number
  at?: number
}

export type FlashcardInput =
  | AdaptiveFlashcard[]
  | Record<string, Omit<AdaptiveFlashcard, 'questionId'>>

export interface CompetencyScore {
  competencyId: string
  score: number
}

export interface AdaptiveExamResult {
  id?: string
  at: number
  score?: number
  competencyScores?: CompetencyScore[] | Record<string, number>
  answers?: AdaptiveQuestionHistory[]
}

export interface AdaptiveModule {
  id: string
  title?: string
  competencyIds?: string[]
  questionIds?: string[]
}

export interface AdaptiveEngineInput {
  questionHistory: AdaptiveQuestionHistory[]
  flashcards: FlashcardInput
  examResults: AdaptiveExamResult[]
  competencies: AdaptiveCompetency[]
  questions: AdaptiveQuestion[]
  modules: AdaptiveModule[]
  now?: number
  masteryThreshold?: number
  dailyMinutes?: number
  certificationId?: string
}

export interface CompetencyAnalysis {
  competencyId: string
  name: string
  masteryScore: number | null
  confidence: number
  target: number
  evidenceCount: number
  correctAttempts: number
  questionAttempts: number
  status: 'unknown' | 'weak' | 'developing' | 'strong'
  recommendedQuestionCount: number
  nextDifficulty: number
  priority: number
  dueFlashcardCount: number
}

export interface AdaptiveRecommendation<T> {
  item: T
  competencyId: string
  reason: string
  difficulty?: number
  priority: number
}

export interface NextBestAction {
  type: AdaptiveActionType
  competencyId: string | null
  title: string
  reason: string
  estimatedMinutes: number
}

export interface CertificationPrediction {
  certificationId: string
  passProbability: number
  confidence: number
  estimatedStudyMinutes: number
  estimatedDays: number | null
  predictedStatus: 'not-enough-data' | 'unlikely' | 'at-risk' | 'likely' | 'ready'
}

export interface AdaptiveEngineOutput {
  nextBestAction: NextBestAction
  nextBestQuestion: AdaptiveRecommendation<AdaptiveQuestion> | null
  nextBestModule: AdaptiveRecommendation<AdaptiveModule> | null
  competencies: CompetencyAnalysis[]
  weakestCompetencyIds: string[]
  readinessScore: number
  certificationPrediction: CertificationPrediction
}

interface Evidence {
  competencyId: string
  score: number
  at: number
  weight: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))
const round = (value: number, precision = 1) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

const ratingScores: Record<FlashcardRating, number> = {
  again: 20,
  hard: 50,
  good: 80,
  easy: 100,
}

function competencySkillIds(competency: AdaptiveCompetency) {
  return competency.skillIds ?? competency.skills?.map(({ skillId }) => skillId) ?? []
}

function validateInput(input: AdaptiveEngineInput) {
  if (!Array.isArray(input.questionHistory) || !Array.isArray(input.examResults) ||
    !Array.isArray(input.competencies) || !Array.isArray(input.questions) || !Array.isArray(input.modules)) {
    throw new Error('Adaptive engine inputs must be arrays.')
  }
  const now = input.now ?? Date.now()
  if (!Number.isFinite(now)) throw new Error('The adaptive calculation time must be finite.')
  if (input.competencies.length === 0 || input.questions.length === 0) {
    throw new Error('Adaptive learning requires at least one competency and question.')
  }
  if (input.dailyMinutes !== undefined &&
    (!Number.isFinite(input.dailyMinutes) || input.dailyMinutes <= 0)) {
    throw new Error('Daily study minutes must be positive.')
  }
  if (input.masteryThreshold !== undefined &&
    (!Number.isFinite(input.masteryThreshold) || input.masteryThreshold < 0 || input.masteryThreshold > 100)) {
    throw new Error('The mastery threshold must be between 0 and 100.')
  }

  for (const collection of [input.competencies, input.questions, input.modules]) {
    const ids = collection.map((item) => item.id)
    if (new Set(ids).size !== ids.length || ids.some((id) => !id.trim())) {
      throw new Error('Competency, question, and module IDs must be unique and non-empty.')
    }
  }
  for (const question of input.questions) {
    if (question.difficulty !== undefined &&
      (!Number.isFinite(question.difficulty) || question.difficulty < 1 || question.difficulty > 5)) {
      throw new Error(`Invalid question difficulty: ${question.id}`)
    }
    if (question.competencyIds && (
      new Set(question.competencyIds).size !== question.competencyIds.length ||
      question.competencyIds.some((competencyId) => !input.competencies.some(({ id }) => id === competencyId))
    )) {
      throw new Error(`Question references an invalid competency: ${question.id}`)
    }
  }
  const questionIds = new Set(input.questions.map(({ id }) => id))
  for (const attempt of input.questionHistory) {
    if (!questionIds.has(attempt.questionId) || !Number.isFinite(attempt.at) || typeof attempt.correct !== 'boolean') {
      throw new Error(`Invalid question attempt: ${attempt.questionId}`)
    }
  }
  for (const result of input.examResults) {
    if (!Number.isFinite(result.at) ||
      (result.score !== undefined && (!Number.isFinite(result.score) || result.score < 0 || result.score > 100))) {
      throw new Error(`Invalid exam result: ${result.id ?? 'unknown'}`)
    }
    for (const answer of result.answers ?? []) {
      if (!questionIds.has(answer.questionId) || typeof answer.correct !== 'boolean') {
        throw new Error(`Invalid exam answer: ${answer.questionId}`)
      }
    }
    for (const score of competencyScores(result.competencyScores)) {
      if (!input.competencies.some(({ id }) => id === score.competencyId) ||
        !Number.isFinite(score.score) || score.score < 0 || score.score > 100) {
        throw new Error(`Invalid exam competency score: ${score.competencyId}`)
      }
    }
  }
  for (const competency of input.competencies) {
    const target = competency.targetMastery ?? competency.minimumTarget
    if (target !== undefined && (!Number.isFinite(target) || target < 0 || target > 100)) {
      throw new Error(`Invalid mastery target: ${competency.id}`)
    }
  }
  for (const card of normalizeFlashcards(input.flashcards)) {
    if (!questionIds.has(card.questionId) || !(card.rating in ratingScores)) {
      throw new Error(`Invalid flashcard: ${card.questionId}`)
    }
  }
}

function normalizeFlashcards(flashcards: FlashcardInput): AdaptiveFlashcard[] {
  if (Array.isArray(flashcards)) return flashcards
  return Object.entries(flashcards).map(([questionId, card]) => ({ questionId, ...card }))
}

function questionCompetencies(question: AdaptiveQuestion, competencies: AdaptiveCompetency[]) {
  if (question.competencyIds?.length) return [...new Set(question.competencyIds)]
  const categorySkill = question.category?.toLowerCase().replaceAll(' ', '-')
  const questionSkills = new Set(question.skillIds ?? (categorySkill ? [categorySkill] : []))
  return competencies
    .filter((competency) => competencySkillIds(competency).some((skillId) => questionSkills.has(skillId)))
    .map((competency) => competency.id)
}

function competencyScores(scores: CompetencyScore[] | Record<string, number> | undefined): CompetencyScore[] {
  if (!scores) return []
  return Array.isArray(scores)
    ? scores
    : Object.entries(scores).map(([competencyId, score]) => ({ competencyId, score }))
}

function collectEvidence(
  input: AdaptiveEngineInput,
  flashcards: AdaptiveFlashcard[],
  questionMap: Map<string, AdaptiveQuestion>,
): Evidence[] {
  const evidence: Evidence[] = []
  const allCompetencyIds = new Set(input.competencies.map(({ id }) => id))
  const add = (competencyIds: string[], score: number, at: number, weight: number) => {
    for (const competencyId of competencyIds) {
      if (allCompetencyIds.has(competencyId)) evidence.push({ competencyId, score, at, weight })
    }
  }

  for (const attempt of input.questionHistory) {
    const question = questionMap.get(attempt.questionId)
    if (!question) continue
    add(questionCompetencies(question, input.competencies), attempt.correct ? 100 : 0, attempt.at, 1)
  }
  for (const card of flashcards) {
    const question = questionMap.get(card.questionId)
    if (!question || !(card.rating in ratingScores)) continue
    const at = card.at ?? Math.max(0, (card.due ?? 0) - (card.interval ?? 1) * DAY)
    add(questionCompetencies(question, input.competencies), ratingScores[card.rating], at, 0.35)
  }
  for (const exam of input.examResults) {
    const scores = competencyScores(exam.competencyScores)
    if (scores.length) {
      for (const item of scores) {
        if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100) {
          throw new Error(`Invalid exam competency score: ${item.competencyId}`)
        }
        add([item.competencyId], item.score, exam.at, 2)
      }
    } else if (exam.answers?.length) {
      for (const answer of exam.answers) {
        const question = questionMap.get(answer.questionId)
        if (question) {
          add(questionCompetencies(question, input.competencies), answer.correct ? 100 : 0, exam.at, 2)
        }
      }
    } else if (exam.score !== undefined) {
      add([...allCompetencyIds], exam.score, exam.at, 2)
    }
  }
  return evidence
}

function analyzeCompetencies(
  input: AdaptiveEngineInput,
  evidence: Evidence[],
  flashcards: AdaptiveFlashcard[],
  now: number,
): CompetencyAnalysis[] {
  const threshold = input.masteryThreshold ?? 80
  const questionById = new Map(input.questions.map((question) => [question.id, question]))
  return input.competencies.map((competency) => {
    const target = competency.targetMastery ?? competency.minimumTarget ?? threshold
    const attempts = evidence
      .filter((event) => event.competencyId === competency.id)
      .sort((a, b) => b.at - a.at)
    const recent = attempts.slice(0, 12)
    let weightedScore = 0
    let totalWeight = 0
    for (const [index, event] of recent.entries()) {
      const ageDays = Math.max(0, (now - event.at) / DAY)
      const decay = 0.5 ** (ageDays / 120)
      const repetitionPenalty = 1 / (1 + index * 0.08)
      const weight = event.weight * decay * repetitionPenalty
      weightedScore += event.score * weight
      totalWeight += weight
    }
    const score = totalWeight ? round(weightedScore / totalWeight) : null
    const confidence = round(clamp(totalWeight / 6, 0, 1), 2)
    const gap = score === null ? 1 : clamp((target - score) / target, 0, 1)
    const count = recent.length
    const questionAttempts = input.questionHistory.filter((attempt) =>
      questionById.has(attempt.questionId) &&
      questionCompetencies(questionById.get(attempt.questionId)!, input.competencies).includes(competency.id),
    )
    const correctAttempts = questionAttempts.filter(({ correct }) => correct).length
    const recentAccuracy = questionAttempts.length
      ? questionAttempts.slice(-5).filter(({ correct }) => correct).length /
        Math.min(5, questionAttempts.length)
      : null
    const nextDifficulty = score === null || recentAccuracy === null
      ? 2
      : clamp(Math.round(1 + clamp(score / 100, 0, 1) * 3.5 + (recentAccuracy >= 0.8 ? 1 : recentAccuracy < 0.5 ? -1 : 0)), 1, 5)
    const recommendedQuestionCount = score !== null && score >= target && confidence >= 0.8
      ? 1
      : Math.ceil(1 + gap * 3 + (1 - confidence))
    const dueFlashcardCount = flashcards.filter((card) =>
      (card.due ?? now) <= now &&
      questionById.has(card.questionId) &&
      questionCompetencies(questionById.get(card.questionId)!, input.competencies).includes(competency.id),
    ).length
    const status: CompetencyAnalysis['status'] = score === null
      ? 'unknown'
      : score >= target && confidence >= 0.65
        ? 'strong'
        : score < Math.min(60, target - 10)
          ? 'weak'
          : 'developing'
    const priority = round(clamp(
      gap * 60 + (1 - confidence) * 25 + (dueFlashcardCount ? 10 : 0) +
      (status === 'unknown' ? 5 : 0), 0, 100,
    ))
    return {
      competencyId: competency.id,
      name: competency.name ?? competency.id,
      masteryScore: score,
      confidence,
      target,
      evidenceCount: count,
      correctAttempts,
      questionAttempts: questionAttempts.length,
      status,
      recommendedQuestionCount,
      nextDifficulty,
      priority,
      dueFlashcardCount,
    }
  }).sort((a, b) => b.priority - a.priority || a.competencyId.localeCompare(b.competencyId))
}

function moduleCompetencies(module: AdaptiveModule, questions: Map<string, AdaptiveQuestion>, competencies: AdaptiveCompetency[]) {
  if (module.competencyIds?.length) return [...new Set(module.competencyIds)]
  return [...new Set((module.questionIds ?? [])
    .flatMap((id) => {
      const question = questions.get(id)
      return question ? questionCompetencies(question, competencies) : []
    }))]
}

function nextModule(
  modules: AdaptiveModule[],
  analysisByCompetency: Map<string, CompetencyAnalysis>,
  questionMap: Map<string, AdaptiveQuestion>,
  competencies: AdaptiveCompetency[],
) {
  const candidates = modules.map((module) => {
    const mappings = moduleCompetencies(module, questionMap, competencies)
    const relevant = mappings.map((id) => analysisByCompetency.get(id)).filter((item) => !!item)
    const priority = relevant.length
      ? relevant.reduce((sum, item) => sum + item.priority, 0) / relevant.length
      : 0
    const weak = relevant.toSorted((a, b) => b.priority - a.priority)[0]
    return weak
      ? { item: module, competencyId: weak.competencyId, priority, reason: `This module addresses ${weak.name}, the highest-impact weakness it covers.` }
      : null
  }).filter((item) => item !== null)
  return candidates.sort((a, b) => b.priority - a.priority || a.item.id.localeCompare(b.item.id))[0] ?? null
}

function nextQuestion(
  questions: AdaptiveQuestion[],
  history: AdaptiveQuestionHistory[],
  analysisByCompetency: Map<string, CompetencyAnalysis>,
  competencies: AdaptiveCompetency[],
) {
  const attemptsByQuestion = new Map<string, AdaptiveQuestionHistory[]>()
  for (const attempt of history) {
    const existing = attemptsByQuestion.get(attempt.questionId) ?? []
    existing.push(attempt)
    attemptsByQuestion.set(attempt.questionId, existing)
  }
  const candidates = questions.flatMap((question) => {
    const relevant = questionCompetencies(question, competencies)
      .map((id) => analysisByCompetency.get(id))
      .filter((item) => !!item)
      .sort((a, b) => b.priority - a.priority)
    const competency = relevant[0]
    if (!competency) return []
    const difficulty = question.difficulty ?? 3
    const difficultyDistance = Math.abs(difficulty - competency.nextDifficulty)
    const attempts = attemptsByQuestion.get(question.id) ?? []
    const mostRecent = attempts.toSorted((a, b) => b.at - a.at)[0]
    const seenPenalty = attempts.length ? Math.min(18, attempts.length * 6) : 0
    const recentCorrectBonus = mostRecent?.correct ? -4 : 8
    const priority = clamp(
      competency.priority + (5 - difficultyDistance) * 4 - seenPenalty + recentCorrectBonus, 0, 100,
    )
    return [{
      item: question,
      competencyId: competency.competencyId,
      difficulty,
      priority: round(priority),
      reason: attempts.length
        ? `${competency.name} needs reinforcement; this question is near the adapted difficulty ${competency.nextDifficulty}.`
        : `${competency.name} is under target and this unseen question matches the adapted difficulty ${competency.nextDifficulty}.`,
    }]
  })
  return candidates.sort((a, b) =>
    b.priority - a.priority ||
    a.item.id.localeCompare(b.item.id),
  )[0] ?? null
}

function predictCertification(
  input: AdaptiveEngineInput,
  competencies: CompetencyAnalysis[],
  readinessScore: number,
) {
  const totalWeight = competencies.reduce((sum, competency) =>
    sum + (input.competencies.find(({ id }) => id === competency.competencyId)?.weight ?? 1), 0)
  const confidence = totalWeight
    ? competencies.reduce((sum, competency) =>
      sum + competency.confidence *
      (input.competencies.find(({ id }) => id === competency.competencyId)?.weight ?? 1), 0) / totalWeight
    : 0
  const observed = competencies.filter(({ masteryScore }) => masteryScore !== null).length / competencies.length
  const passProbability = Math.round(clamp(
    100 / (1 + Math.exp(-(readinessScore - 70) / 9)) *
    (0.55 + confidence * 0.45) * observed,
    0, 100,
  ))
  const remainingGap = competencies.reduce((sum, competency) =>
    sum + Math.max(0, competency.target - (competency.masteryScore ?? 0)) *
    (input.competencies.find(({ id }) => id === competency.competencyId)?.weight ?? 1), 0)
  const estimatedStudyMinutes = Math.round(clamp(remainingGap * 0.6, 0, 600))
  const dailyMinutes = input.dailyMinutes ?? 20
  const estimatedDays = dailyMinutes > 0 ? Math.ceil(estimatedStudyMinutes / dailyMinutes) : null
  const predictedStatus = observed < 0.6
    ? 'not-enough-data'
    : passProbability >= 85 && readinessScore >= 85
      ? 'ready'
      : passProbability >= 70
        ? 'likely'
        : passProbability >= 45
          ? 'at-risk'
          : 'unlikely'
  return {
    certificationId: input.certificationId ?? 'adaptive-certification',
    passProbability,
    confidence: round(confidence, 2),
    estimatedStudyMinutes,
    estimatedDays,
    predictedStatus,
  } satisfies CertificationPrediction
}

export function calculateAdaptiveLearning(input: AdaptiveEngineInput): AdaptiveEngineOutput {
  validateInput(input)
  const now = input.now ?? Date.now()
  const questionMap = new Map(input.questions.map((question) => [question.id, question]))
  const flashcards = normalizeFlashcards(input.flashcards)
  const evidence = collectEvidence(input, flashcards, questionMap)
  const competencies = analyzeCompetencies(input, evidence, flashcards, now)
  const analysisByCompetency = new Map(competencies.map((competency) => [competency.competencyId, competency]))
  const focus = competencies[0]
  const flashcardFocus = competencies.find(({ dueFlashcardCount }) => dueFlashcardCount > 0)
  const weakestCompetencyIds = competencies
    .filter(({ status }) => status === 'unknown' || status === 'weak' || status === 'developing')
    .map(({ competencyId }) => competencyId)
  const recommendedQuestion = nextQuestion(input.questions, input.questionHistory, analysisByCompetency, input.competencies)
  const recommendedModule = nextModule(input.modules, analysisByCompetency, questionMap, input.competencies)
  const weightedReadiness = competencies.reduce((sum, competency) => {
    const weight = input.competencies.find(({ id }) => id === competency.competencyId)?.weight ?? 1
    const evidenceAdjusted = (competency.masteryScore ?? 0) *
      (0.7 + competency.confidence * 0.3)
    return { sum: sum.sum + evidenceAdjusted * weight, weight: sum.weight + weight }
  }, { sum: 0, weight: 0 })
  const readinessScore = weightedReadiness.weight
    ? Math.round(weightedReadiness.sum / weightedReadiness.weight)
    : 0
  const certificationPrediction = predictCertification(input, competencies, readinessScore)

  let nextBestAction: NextBestAction
  if (!input.questionHistory.length && !input.examResults.length) {
    nextBestAction = {
      type: 'diagnostic_exam',
      competencyId: focus?.competencyId ?? null,
      title: 'Take a diagnostic exam',
      reason: 'A short diagnostic across all competencies avoids spending time on material you already know.',
      estimatedMinutes: 12,
    }
  } else if (flashcardFocus) {
    nextBestAction = {
      type: 'flashcard_review',
      competencyId: flashcardFocus.competencyId,
      title: `Review ${flashcardFocus.name} flashcards`,
      reason: `${flashcardFocus.dueFlashcardCount} due card${flashcardFocus.dueFlashcardCount === 1 ? '' : 's'} can improve retention before new content.`,
      estimatedMinutes: Math.max(5, Math.min(15, flashcardFocus.dueFlashcardCount * 2)),
    }
  } else if (certificationPrediction.passProbability >= 85 && readinessScore >= 85) {
    nextBestAction = {
      type: 'certify',
      competencyId: null,
      title: 'Schedule the certification',
      reason: 'Readiness and evidence confidence indicate additional study is likely to have diminishing returns.',
      estimatedMinutes: 0,
    }
  } else if (focus && (focus.status === 'unknown' || focus.status === 'weak') && recommendedModule) {
    nextBestAction = {
      type: 'study_module',
      competencyId: focus.competencyId,
      title: `Study ${recommendedModule.item.title ?? recommendedModule.item.id}`,
      reason: `${focus.name} has the largest readiness gap; focused study is more efficient than broad review.`,
      estimatedMinutes: input.dailyMinutes ?? 20,
    }
  } else if (readinessScore >= 70) {
    nextBestAction = {
      type: 'mock_exam',
      competencyId: focus?.competencyId ?? null,
      title: 'Take a readiness mock exam',
      reason: 'Balanced competency mastery makes a mixed mock exam the fastest way to close uncertainty.',
      estimatedMinutes: 30,
    }
  } else {
    nextBestAction = {
      type: 'practice_question',
      competencyId: focus?.competencyId ?? null,
      title: `Practice ${focus?.name ?? 'your weakest competency'}`,
      reason: focus
        ? `Targeted difficulty ${focus.nextDifficulty} questions will update this competency without over-testing stronger areas.`
        : 'Targeted practice is the fastest next step.',
      estimatedMinutes: 10,
    }
  }

  return {
    nextBestAction,
    nextBestQuestion: recommendedQuestion,
    nextBestModule: recommendedModule,
    competencies,
    weakestCompetencyIds,
    readinessScore,
    certificationPrediction,
  }
}

export const getNextBestAction = (input: AdaptiveEngineInput) => calculateAdaptiveLearning(input).nextBestAction
export const getNextBestQuestion = (input: AdaptiveEngineInput) => calculateAdaptiveLearning(input).nextBestQuestion
export const getNextBestModule = (input: AdaptiveEngineInput) => calculateAdaptiveLearning(input).nextBestModule

export class AdaptiveCertificationEngine {
  private readonly options: Omit<AdaptiveEngineInput, 'questionHistory' | 'flashcards' | 'examResults'>

  constructor(options: Omit<AdaptiveEngineInput, 'questionHistory' | 'flashcards' | 'examResults'>) {
    this.options = options
  }

  recommend(
    progress: Pick<AdaptiveEngineInput, 'questionHistory' | 'flashcards' | 'examResults'>,
  ): AdaptiveEngineOutput {
    return calculateAdaptiveLearning({ ...this.options, ...progress })
  }
}
