import { describe, expect, it } from 'vitest'
import { forecastCertification } from './gpsForecast'
import type { CertificationGpsAssessment } from './gpsModels'
import { estimateStudyDistance, planFastestRoute, planRoadblocks } from './gpsPlanner'

const assessment: CertificationGpsAssessment = {
  certificationId: 'core',
  certificationName: 'Ignition Core Certification',
  readiness: 63,
  coverage: 0.72,
  targetReadiness: 80,
  skills: [
    { id: 'perspective', name: 'Perspective', score: 58, coverage: 0.6, priority: 72 },
    { id: 'security', name: 'Security', score: 42, coverage: 0.8, priority: 94 },
    { id: 'gateway', name: 'Gateway', score: 78, coverage: 1, priority: 18 },
  ],
}

describe('certification GPS planning', () => {
  it('prioritizes roadblocks and produces actionable fastest-route steps', () => {
    const roadblocks = planRoadblocks(assessment)
    expect(roadblocks.map(({ name }) => name)).toEqual(['Security', 'Perspective'])
    expect(planFastestRoute(assessment).map(({ title, kind }) => ({ title, kind }))).toEqual([
      { title: 'Security Flashcards', kind: 'flashcards' },
      { title: 'Perspective Quiz', kind: 'practice' },
      { title: 'Security Zones Module', kind: 'module' },
    ])
  })

  it('calculates distance and bounds forecasts to the mastery target', () => {
    const distance = estimateStudyDistance(assessment)
    expect(distance).toBeGreaterThan(0)
    expect(forecastCertification(63, 0.72, distance, {
      days: 7,
      dailyStudyMinutes: 45,
      masteryTarget: 84,
    })).toMatchObject({ days: 7, projectedReadiness: 84, confidence: 'strong' })
  })

  it('does not invent evidence for an unassessed learner', () => {
    const empty = { ...assessment, readiness: null, coverage: 0, skills: assessment.skills.map((skill) => ({ ...skill, score: null, coverage: 0 })) }
    const result = forecastCertification(null, 0, estimateStudyDistance(empty))
    expect(result).toMatchObject({ projectedReadiness: 0, confidence: 'building' })
  })
})
