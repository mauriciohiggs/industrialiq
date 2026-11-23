import { describe, expect, it } from 'vitest'
import { DAY } from '../lib/study'
import {
  calculateCompetencyIntelligence,
  rankReviewCandidates,
  type SkillEvidence,
} from './competencyEngine'

const graph = {
  skills: [
    { id: 'tags', decayHalfLifeDays: 30 },
    { id: 'security' },
  ],
  competencies: [{ id: 'design', skills: [{ skillId: 'tags', weight: 2 }, { skillId: 'security', weight: 1 }] }],
  certifications: [{
    id: 'core',
    competencies: [{ competencyId: 'design', weight: 1 }],
    minimumCoverage: 0.5,
    minimumConfidence: 0.1,
  }],
  careerPaths: [{
    id: 'technician',
    competencies: [{ competencyId: 'design', target: 70, weight: 1 }],
    minimumCoverage: 0.5,
    minimumConfidence: 0.1,
  }],
}

describe('competency intelligence engine', () => {
  const now = 1_000 * DAY

  it('aggregates assessed evidence and applies knowledge decay', () => {
    const evidence: SkillEvidence[] = [{
      id: 'exam-1',
      sourceType: 'exam',
      sourceId: 'exam',
      observedAt: now - 30 * DAY,
      score: 100,
      skillWeights: [{ skillId: 'tags', weight: 2 }],
    }, {
      id: 'question-1',
      sourceType: 'question',
      sourceId: 'question',
      observedAt: now,
      score: 80,
      skillWeights: [{ skillId: 'security', weight: 1 }],
    }]
    const result = calculateCompetencyIntelligence(graph, evidence, now)
    expect(result.skills[0]).toMatchObject({ score: 50, unweightedScore: 100, decayLoss: 50 })
    expect(result.competencies[0].coverage).toBe(1)
    expect(result.certifications[0].blockingCompetencyIds).toEqual(['design'])
    expect(result.careerPaths[0].score).toBeGreaterThan(0)
  })

  it('does not infer mastery from missing or flashcard-only evidence', () => {
    const evidence: SkillEvidence[] = [{
      id: 'card-1',
      sourceType: 'flashcard',
      sourceId: 'card',
      observedAt: now,
      score: 100,
      skillWeights: [{ skillId: 'tags', weight: 1 }],
    }]
    const result = calculateCompetencyIntelligence(graph, evidence, now)
    expect(result.skills[0]).toMatchObject({ score: 100, confidence: 0, status: 'developing' })
    expect(result.skills[1]).toMatchObject({ score: null, status: 'no-evidence' })
    expect(result.certifications[0].status).toBe('insufficient-evidence')
    expect(result.weaknesses[0].skillId).toBe('security')
  })

  it('limits repeated attempts on the same item and rejects invalid graph data', () => {
    const evidence: SkillEvidence[] = [{
      id: 'first',
      sourceType: 'question',
      sourceId: 'same-question',
      observedAt: now - DAY,
      score: 0,
      skillWeights: [{ skillId: 'tags', weight: 1 }],
    }, {
      id: 'second',
      sourceType: 'question',
      sourceId: 'same-question',
      observedAt: now,
      score: 100,
      skillWeights: [{ skillId: 'tags', weight: 1 }],
    }]
    const result = calculateCompetencyIntelligence(graph, evidence, now)
    expect(result.skills[0].unweightedScore).toBe(66.7)
    expect(() => calculateCompetencyIntelligence(graph, [evidence[0], evidence[0]], now)).toThrow(/Invalid evidence/)
    expect(() => calculateCompetencyIntelligence({
      ...graph,
      competencies: [{ id: 'broken', skills: [{ skillId: 'missing', weight: 1 }] }],
    }, [], now)).toThrow(/Unknown skill/)
  })

  it('prioritizes overdue cards for weak skills', () => {
    const evidence: SkillEvidence[] = [{
      id: 'weak-evidence',
      sourceType: 'exam',
      sourceId: 'exam',
      observedAt: now - 5 * DAY,
      score: 30,
      skillWeights: [{ skillId: 'tags', weight: 1 }],
    }]
    const result = calculateCompetencyIntelligence(graph, evidence, now)
    const queue = rankReviewCandidates([
      { id: 'overdue', skillIds: ['tags'], dueAt: now - 3 * DAY, intervalDays: 6 },
      { id: 'future', skillIds: ['tags'], dueAt: now + 3 * DAY, intervalDays: 6 },
      { id: 'security', skillIds: ['security'], dueAt: now, intervalDays: 6 },
    ], result.skills, result.weaknesses, now)
    expect(queue[0].id).toBe('security')
    expect(queue.find(({ id }) => id === 'overdue')!.priority)
      .toBeGreaterThan(queue.find(({ id }) => id === 'future')!.priority)
  })
})
