import type { Category } from '../types'
import type { MentorCoachingInput } from './coaching'

export interface MentorMessage {
  role: 'learner' | 'mentor'
  text: string
  at: number
}

export interface Recommendation {
  skillId: string
  reason: string
}

export interface StudyPlan {
  recommendations: Recommendation[]
}

export interface LearningEvent {
  type: 'question-answered' | 'card-reviewed'
  questionId: string
  at: number
}

export interface MentorSkill {
  id: string
  name: Category
  score: number | null
  answered: number
  coverage: number
  trend: number | null
}

export interface MentorTask {
  id: string
  title: string
  description: string
  category: Category | 'All topics'
  duration: string
  xp: number
  kind: 'review' | 'practice' | 'exam'
}

export interface MentorDay {
  label: string
  date: number
  title: string
  minutes: number
  state: 'done' | 'today' | 'upcoming'
}

export interface MentorReadinessItem {
  id: string
  name: string
  score: number | null
  status: 'insufficient-evidence' | 'not-ready' | 'nearly-ready' | 'ready'
}

export interface MentorSummary {
  readiness: number | null
  topStrength: string | null
  biggestGap: string | null
  recommendedAction: string
  estimatedImprovement: number
}

export interface MentorDashboardData {
  readiness: number | null
  confidence: 'insufficient' | 'building' | 'ready'
  evidenceCount: number
  coverage: number
  skills: MentorSkill[]
  strengths: MentorSkill[]
  weaknesses: MentorSkill[]
  certifications: MentorReadinessItem[]
  careers: MentorReadinessItem[]
  summary: MentorSummary
  tasks: MentorTask[]
  studyPlan: MentorDay[]
  forecastDays: number | null
  coachingInput: MentorCoachingInput
}
