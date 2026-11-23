import { describe, expect, it, vi } from 'vitest'
import { questions, validateBank } from '../data/bank'
import { categories } from '../data/categories'
import type { Progress } from '../types'
import { addActivity, categoryStats, createQuiz, DAY, emptyProgress, filterBank, gradeQuiz, localDate, reviewQueue, scheduleCard, shuffle, streak } from './study'

const now = new Date(2026, 10, 23, 12).getTime()
const first = questions[0]
const second = questions[1]

describe('contributed question bank', () => {
  it('can supply a full exam and flashcards across every supported topic', () => {
    expect(questions.length).toBeGreaterThanOrEqual(50)
    for (const category of categories) {
      expect(questions.some((question) => question.category === category.name)).toBe(true)
    }
    expect(validateBank(questions)).toBe(questions)
  })

  it.each([
    [{ ...first, correct: 4 }],
    [{ ...first, options: ['A', 'A', 'C', 'D'] }],
    [{ ...first, category: 'Unknown' }],
    [{ ...first, explanation: '' }],
    [first, first],
  ])('rejects invalid or duplicate contributions: %j', (...bank) => {
    expect(() => validateBank(bank)).toThrow()
  })
})

describe('randomized quizzes and grading', () => {
  it('shuffles a copy instead of sorting or mutating the source', () => {
    const source = [1, 2, 3, 4]
    expect(shuffle(source, () => 0)).toEqual([2, 3, 4, 1])
    expect(source).toEqual([1, 2, 3, 4])
  })

  it('uses unique questions, caps small banks, and retains answer identity after shuffling', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const exam = createQuiz(questions, 50)
      expect(exam).toHaveLength(50)
      expect(new Set(exam.map((question) => question.id)).size).toBe(50)
      expect(exam[0].choices.map((choice) => choice.originalIndex)).toEqual([1, 2, 3, 0])
      for (const question of exam) {
        expect(question.choices.find((choice) => choice.originalIndex === question.correct)?.text).toBe(question.options[question.correct])
      }
      expect(createQuiz([first, second], 50)).toHaveLength(2)
    } finally {
      random.mockRestore()
    }
  })

  it('creates a new question and choice order on each new attempt', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const one = createQuiz(questions, 10)
      random.mockReturnValue(0.999)
      const two = createQuiz(questions, 10)
      expect(one.map((question) => question.id)).not.toEqual(two.map((question) => question.id))
      expect(one[0].choices.map((choice) => choice.originalIndex)).not.toEqual(two[0].choices.map((choice) => choice.originalIndex))
    } finally {
      random.mockRestore()
    }
  })

  it('scores original answer indices and counts skipped questions as incorrect', () => {
    const result = gradeQuiz([first, second], { [first.id]: first.correct }, now)
    expect(result.correct).toBe(1)
    expect(result.percentage).toBe(50)
    expect(result.answers).toEqual([
      { questionId: first.id, correct: true, at: now },
      { questionId: second.id, correct: false, at: now },
    ])
  })

  it('removes a question from the missed bank after a later correct response', () => {
    const progress = emptyProgress()
    progress.answers = [
      { questionId: first.id, correct: false, at: now },
      { questionId: second.id, correct: false, at: now },
      { questionId: first.id, correct: true, at: now + 1 },
    ]
    expect(filterBank(questions, 'Missed questions', progress).map((question) => question.id)).toEqual([second.id])
    expect(filterBank(questions, 'Security', progress).every((question) => question.category === 'Security')).toBe(true)
  })
})

describe('spaced repetition', () => {
  it.each([['again', 1], ['hard', 3], ['good', 7], ['easy', 21]] as const)('schedules a first %s review for %i days', (rating, days) => {
    expect(scheduleCard(undefined, rating, now)).toEqual({ due: now + days * DAY, interval: days, reviews: 1, rating })
  })

  it('expands successful intervals and resets forgotten cards to one day', () => {
    const previous = scheduleCard(undefined, 'easy', now)
    expect(scheduleCard(previous, 'good', now).interval).toBe(42)
    expect(scheduleCard(previous, 'hard', now).interval).toBe(25)
    expect(scheduleCard(previous, 'easy', now).interval).toBe(53)
    expect(scheduleCard(previous, 'again', now)).toEqual({ due: now + DAY, interval: 1, reviews: 2, rating: 'again' })
  })

  it('excludes future cards normally, includes them when studying ahead, and prioritizes due cards', () => {
    const third = questions[2]
    const progress = emptyProgress()
    progress.cards[first.id] = scheduleCard(undefined, 'good', now)
    progress.cards[second.id] = scheduleCard(undefined, 'again', now - DAY)
    const queue = reviewQueue([first, second, third], progress, now)
    expect(queue.map((question) => question.id)).toEqual([second.id, third.id])
    expect(reviewQueue([first, second, third], progress, now, true)).toHaveLength(3)
  })

  it('prioritizes missed questions and then weaker categories among new cards', () => {
    const security = questions.find((question) => question.category === 'Security')!
    const progress = emptyProgress()
    progress.answers = [{ questionId: first.id, correct: false, at: now }]
    expect(reviewQueue([security, first], progress, now)[0].id).toBe(first.id)
    progress.answers = [{ questionId: second.id, correct: false, at: now }]
    const queue = reviewQueue([security, first, second], progress, now)
    expect(queue.findIndex((question) => question.id === first.id)).toBeLessThan(queue.findIndex((question) => question.id === security.id))
  })

  it('keeps overdue strong-topic cards ahead of newly missed weak-topic cards', () => {
    const security = questions.find((question) => question.category === 'Security')!
    const progress = emptyProgress()
    progress.cards[first.id] = scheduleCard(undefined, 'good', now - 7 * DAY)
    progress.answers = [
      { questionId: first.id, correct: true, at: now },
      { questionId: security.id, correct: false, at: now },
    ]
    expect(reviewQueue([first, security], progress, now).map((question) => question.id)).toEqual([first.id, security.id])
  })
})

describe('honest analytics and study activity', () => {
  it('uses the last 200 answers, filters topics, and does not invent an accuracy without data', () => {
    const progress = emptyProgress()
    expect(categoryStats(questions, progress).accuracy).toBeNull()
    progress.answers = [
      { questionId: first.id, correct: false, at: now },
      ...Array.from({ length: 200 }, () => ({ questionId: second.id, correct: true, at: now })),
    ]
    expect(categoryStats(questions, progress)).toEqual({ total: 200, correct: 200, accuracy: 100 })
    expect(categoryStats(questions, progress, 'Security').accuracy).toBeNull()
  })

  it('records each local study day once', () => {
    const progress = emptyProgress()
    progress.activity = addActivity(progress, now)
    expect(addActivity(progress, now)).toEqual([localDate(now)])
  })

  it('counts consecutive local days, permits yesterday, and resets after a gap', () => {
    const activity = ['2026-11-20', '2026-11-21', '2026-11-22']
    expect(streak(activity, now)).toBe(3)
    expect(streak([...activity, '2026-11-23'], now)).toBe(4)
    expect(streak(['2026-11-21'], now)).toBe(0)
  })

  it('preserves review history and answers independently', () => {
    const progress: Progress = emptyProgress()
    progress.cards[first.id] = scheduleCard(undefined, 'good', now)
    expect(categoryStats(questions, progress).accuracy).toBeNull()
  })
})
