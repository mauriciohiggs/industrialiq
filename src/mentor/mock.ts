import type { ReadinessResult } from '../analytics/readiness'
import type { MentorMessage, StudyPlan } from './models'

export function mockMentorReply(at: number): MentorMessage {
  return { role: 'mentor', text: 'This is a mock mentor. Review your learning modules and practice regularly.', at }
}

export function mockStudyPlan(readiness: ReadinessResult): StudyPlan {
  return {
    recommendations: readiness.recommendedSkills.map((skillId) => ({
      skillId,
      reason: readiness.weakAreas.includes(skillId) ? 'Review this practice area.' : 'Gather practice evidence for this skill.',
    })),
  }
}
