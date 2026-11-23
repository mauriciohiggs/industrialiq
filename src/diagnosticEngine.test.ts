import { describe, expect, it } from 'vitest'
import { questions } from './data/bank'
import {
  createIndustrialDiagnosticQuestions,
  DiagnosticEngine,
  industrialDiagnosticGraph,
  shouldCompleteDiagnostic,
} from './diagnosticEngine'
import { generateDiagnosticReport } from './diagnosticReport'

describe('adaptive diagnostic engine', () => {
  it('covers the industrial competencies and completes a short assessment', () => {
    const bank = createIndustrialDiagnosticQuestions(questions)
    const engine = new DiagnosticEngine(bank, industrialDiagnosticGraph)
    let session = engine.start('learner-1', 1_000)
    let answerTime = 1_000

    while (!shouldCompleteDiagnostic(session, industrialDiagnosticGraph, engine.configuration)) {
      const presented = engine.next(session)
      expect(presented).not.toBeNull()
      session = presented!.session
      answerTime += 20_000
      session = engine.answer(session, presented!.question.correctOptionIndex, answerTime)
    }

    expect(session.answers.length).toBeGreaterThanOrEqual(10)
    expect(session.answers.length).toBeLessThanOrEqual(12)
    expect(new Set(session.answers.flatMap((answer) => answer.skillIds)).size).toBeGreaterThanOrEqual(9)

    const completed = engine.complete(session, answerTime)
    const report = generateDiagnosticReport(completed, bank, industrialDiagnosticGraph, answerTime)
    expect(report.currentReadiness.score).toBe(100)
    expect(report.currentReadiness.coverage).toBe(1)
    expect(report.topStrengths).toHaveLength(3)
    expect(report.learningPath).toHaveLength(0)
  })

  it('adapts difficulty and produces prioritized gaps for incorrect answers', () => {
    const bank = createIndustrialDiagnosticQuestions(questions)
    const engine = new DiagnosticEngine(bank, industrialDiagnosticGraph)
    let session = engine.start('learner-2', 10_000)
    let answerTime = 10_000
    const difficulties: number[] = []

    while (!shouldCompleteDiagnostic(session, industrialDiagnosticGraph, engine.configuration)) {
      const presented = engine.next(session)
      expect(presented).not.toBeNull()
      if (!presented) break
      session = presented.session
      difficulties.push(presented.question.difficulty)
      answerTime += 20_000
      const wrongIndex = (presented.question.correctOptionIndex + 1) % presented.question.options.length
      session = engine.answer(session, wrongIndex, answerTime)
    }

    const report = generateDiagnosticReport(engine.complete(session, answerTime), bank, industrialDiagnosticGraph, answerTime)
    expect(report.currentReadiness.level).toBe('foundation')
    expect(report.topWeaknesses).toHaveLength(3)
    expect(report.skillGaps[0].currentScore).toBe(0)
    expect(report.learningPath[0].estimatedMinutes).toBeGreaterThan(0)
    expect(Math.max(...difficulties) - Math.min(...difficulties)).toBeGreaterThan(0)
  })

  it('rejects answering the same active item twice and incomplete completion', () => {
    const bank = createIndustrialDiagnosticQuestions(questions)
    const engine = new DiagnosticEngine(bank, industrialDiagnosticGraph)
    const started = engine.start('learner-3', 100)
    const presented = engine.next(started)!
    const answered = engine.answer(presented.session, 0, 200)
    expect(() => engine.answer(answered, 0, 300)).toThrow(/No diagnostic question/)
    expect(() => engine.complete(answered, 300)).toThrow(/at least 10/)
  })
})
