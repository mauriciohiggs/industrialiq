import { describe, expect, it } from 'vitest'
import { calculateReadiness } from './readiness'
import { mockMentorReply, mockStudyPlan } from '../mentor/mock'
import { ignitionCoreCourse, ignitionCoreModules } from '../courses/industrial-automation/ignition-core/course'
import { questions, validateBank } from '../data/bank'

const skills = [
  { id: 'a', name: 'A', description: '' },
  { id: 'b', name: 'B', description: '' },
]
const competencies = [{ id: 'c', name: 'C', description: '', skillIds: ['a', 'b'] }]
const certifications = [{ id: 'cert', name: 'Cert', issuer: 'Issuer', competencyIds: ['c'] }]

describe('illustrative readiness', () => {
  it('calculates complete scores and identifies weak skills', () => {
    const result = calculateReadiness(skills, competencies, certifications, [{ skillId: 'a', score: 60 }, { skillId: 'b', score: 90 }])
    expect(result).toEqual({
      overallScore: 75,
      competencyScores: [{ competencyId: 'c', score: 75 }],
      certificationReadiness: [{ certificationId: 'cert', score: 75 }],
      recommendedSkills: ['a'],
      weakAreas: ['a'],
    })
    expect(mockStudyPlan(result).recommendations).toEqual([{ skillId: 'a', reason: 'Review this practice area.' }])
  })

  it('reports incomplete evidence instead of treating it as zero', () => {
    const result = calculateReadiness(skills, competencies, certifications, [{ skillId: 'a', score: 100 }])
    expect(result.overallScore).toBeNull()
    expect(result.certificationReadiness[0].score).toBeNull()
    expect(result.recommendedSkills).toEqual(['b'])
    expect(mockStudyPlan(result).recommendations[0].reason).toContain('evidence')
    expect(calculateReadiness([], [], [], []).overallScore).toBeNull()
    expect(mockMentorReply(123)).toEqual({ role: 'mentor', text: expect.stringContaining('mock mentor'), at: 123 })
  })

  it('rejects invalid scores and broken or duplicate mappings', () => {
    expect(() => calculateReadiness(skills, competencies, certifications, [{ skillId: 'a', score: NaN }])).toThrow()
    expect(() => calculateReadiness(skills, competencies, certifications, [{ skillId: 'a', score: 101 }])).toThrow()
    expect(() => calculateReadiness(skills, competencies, certifications, [{ skillId: 'a', score: 0 }, { skillId: 'a', score: 1 }])).toThrow()
    expect(() => calculateReadiness(skills, [{ ...competencies[0], skillIds: ['missing'] }], certifications, [])).toThrow()
    expect(() => calculateReadiness(skills, competencies, [{ ...certifications[0], competencyIds: ['c', 'c'] }], [])).toThrow()
  })
})

describe('Ignition Core course', () => {
  it('groups the existing questions exactly once without changing their IDs', () => {
    expect(ignitionCoreCourse.moduleIds).toEqual(ignitionCoreModules.map((module) => module.id))
    expect(ignitionCoreModules.flatMap((module) => module.questionIds).sort()).toEqual(questions.map((question) => question.id).sort())
  })

  it('validates optional question-to-skill mappings', () => {
    expect(validateBank([{ ...questions[0], skillIds: ['skill-a'] }])[0].skillIds).toEqual(['skill-a'])
    expect(() => validateBank([{ ...questions[0], skillIds: ['skill-a', 'skill-a'] }])).toThrow()
    expect(() => validateBank([{ ...questions[0], skillIds: [null] }])).toThrow()
  })
})
