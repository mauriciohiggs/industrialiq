import { describe, expect, it } from 'vitest'
import { mentorDashboardData } from '../mentor/dashboardData'
import { emptyProgress, DAY } from '../lib/study'
import { calculateIndustrialIntelligence, learningEvidence } from './industrialIntelligence'

describe('IndustrialIQ local intelligence integration', () => {
  const now = 2_000 * DAY

  it('converts persisted question attempts into skill evidence', () => {
    const progress = emptyProgress()
    progress.answers = [
      { questionId: 'perspective-01', correct: true, at: now - DAY },
      { questionId: 'perspective-01', correct: false, at: now },
    ]
    progress.activity = ['2026-11-22', '2026-11-23']

    const evidence = learningEvidence(progress)
    expect(evidence).toHaveLength(2)
    expect(evidence.map(({ score }) => score)).toEqual([100, 0])
    expect(evidence[0].skillWeights).toEqual([{ skillId: 'perspective', weight: 1 }])

    const result = calculateIndustrialIntelligence(progress, now)
    const perspective = result.skills.find(({ skillId }) => skillId === 'perspective')!
    expect(perspective.evidenceCount).toBe(2)
    expect(perspective.lastObservedAt).toBe(now)
    expect(perspective.score).toBeLessThan(100)
  })

  it('rolls local study behavior into certification and all career paths', () => {
    const progress = emptyProgress()
    progress.answers = [
      { questionId: 'gateway-01', correct: true, at: now },
      { questionId: 'perspective-01', correct: true, at: now },
      { questionId: 'security-01', correct: false, at: now },
      { questionId: 'historian-01', correct: true, at: now },
    ]

    const dashboard = mentorDashboardData(progress, now)
    expect(dashboard.readiness).not.toBeNull()
    expect(dashboard.certifications).toHaveLength(1)
    expect(dashboard.careers.map(({ name }) => name)).toEqual([
      'SCADA Engineer',
      'Controls Engineer',
      'Automation Engineer',
      'OT Security Analyst',
      'Industrial Cybersecurity Engineer',
      'Reliability Engineer',
    ])
    expect(dashboard.summary.biggestGap).toBe('Security')
    expect(dashboard.summary.recommendedAction).toContain('Security flashcards')
    expect(dashboard.evidenceCount).toBe(4)
  })
})
