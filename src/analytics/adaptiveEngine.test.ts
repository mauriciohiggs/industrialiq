import { describe, expect, it } from 'vitest'
import { DAY } from '../lib/study'
import { calculateAdaptiveLearning, type AdaptiveEngineInput } from './adaptiveEngine'

const now = 1_000 * DAY
const base: AdaptiveEngineInput = {
  questionHistory: [],
  flashcards: {},
  examResults: [],
  competencies: [
    { id: 'platform', skillIds: ['gateway'], targetMastery: 80 },
    { id: 'security', skillIds: ['security'], targetMastery: 80 },
  ],
  questions: [
    { id: 'p1', skillIds: ['gateway'], difficulty: 1 },
    { id: 'p2', skillIds: ['gateway'], difficulty: 3 },
    { id: 'p3', skillIds: ['gateway'], difficulty: 5 },
    { id: 's1', skillIds: ['security'], difficulty: 1 },
    { id: 's2', skillIds: ['security'], difficulty: 3 },
    { id: 's3', skillIds: ['security'], difficulty: 5 },
  ],
  modules: [
    { id: 'platform-module', questionIds: ['p1', 'p2', 'p3'] },
    { id: 'security-module', questionIds: ['s1', 's2', 's3'] },
  ],
  now,
}

describe('adaptive certification engine', () => {
  it('starts with a diagnostic when no evidence exists', () => {
    const result = calculateAdaptiveLearning(base)

    expect(result.nextBestAction.type).toBe('diagnostic_exam')
    expect(result.competencies.map(({ status }) => status)).toEqual(['unknown', 'unknown'])
    expect(result.nextBestQuestion).not.toBeNull()
    expect(result.nextBestModule).not.toBeNull()
  })

  it('allocates more questions and lower difficulty to weak competencies', () => {
    const history = [
      { questionId: 'p1', correct: true, at: now - DAY },
      { questionId: 'p2', correct: true, at: now - 2 * DAY },
      { questionId: 'p3', correct: true, at: now - 3 * DAY },
      { questionId: 's1', correct: false, at: now - DAY },
      { questionId: 's2', correct: false, at: now - 2 * DAY },
      { questionId: 's3', correct: false, at: now - 3 * DAY },
    ]
    const result = calculateAdaptiveLearning({ ...base, questionHistory: history })
    const platform = result.competencies.find(({ competencyId }) => competencyId === 'platform')!
    const security = result.competencies.find(({ competencyId }) => competencyId === 'security')!

    expect(security.recommendedQuestionCount).toBeGreaterThan(platform.recommendedQuestionCount)
    expect(security.nextDifficulty).toBeLessThan(platform.nextDifficulty)
    expect(result.nextBestQuestion?.competencyId).toBe('security')
    expect(result.nextBestModule?.competencyId).toBe('security')
  })

  it('prioritizes due flashcards for the weakest competency', () => {
    const result = calculateAdaptiveLearning({
      ...base,
      questionHistory: [{ questionId: 's1', correct: false, at: now - 10 * DAY }],
      flashcards: {
        s2: { rating: 'again', due: now - DAY, interval: 1, reviews: 1 },
      },
    })

    expect(result.nextBestAction).toMatchObject({
      type: 'flashcard_review',
      competencyId: 'security',
    })
  })

  it('uses exam competency scores and predicts certification readiness', () => {
    const result = calculateAdaptiveLearning({
      ...base,
      examResults: [{
        id: 'mock-1',
        at: now - DAY,
        competencyScores: { platform: 96, security: 94 },
      }],
    })

    expect(result.readinessScore).toBeGreaterThan(70)
    expect(result.certificationPrediction.passProbability).toBeGreaterThan(0)
    expect(result.certificationPrediction).toMatchObject({
      estimatedDays: expect.any(Number),
    })
  })

  it('accepts the current graph, question, and flashcard shapes without adapters', () => {
    const result = calculateAdaptiveLearning({
      ...base,
      competencies: [
        { id: 'platform', skills: [{ skillId: 'gateway', weight: 1 }], minimumTarget: 70 },
      ],
      questions: [
        { id: 'gateway-1', category: 'Gateway', difficulty: 2 },
      ],
      modules: [{ id: 'gateway-module', title: 'Gateway', questionIds: ['gateway-1'] }],
      questionHistory: [{ questionId: 'gateway-1', correct: true, at: now - DAY }],
      flashcards: {
        'gateway-1': { rating: 'good', due: now + DAY, interval: 7, reviews: 1 },
      },
    })

    expect(result.competencies[0].competencyId).toBe('platform')
    expect(result.competencies[0].evidenceCount).toBe(2)
    expect(result.nextBestQuestion?.item.id).toBe('gateway-1')
    expect(result.nextBestModule?.item.id).toBe('gateway-module')
  })

  it('rejects invalid difficulty values', () => {
    expect(() => calculateAdaptiveLearning({
      ...base,
      questions: [{ ...base.questions[0], difficulty: 6 }],
    })).toThrow(/Invalid question difficulty/)
  })

  it('rejects unknown history items instead of silently ignoring evidence', () => {
    expect(() => calculateAdaptiveLearning({
      ...base,
      questionHistory: [{ questionId: 'missing', correct: true, at: now }],
    })).toThrow(/Invalid question attempt/)
  })
})
