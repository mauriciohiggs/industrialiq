export type DiagnosticDifficulty = 1 | 2 | 3 | 4 | 5

export interface DiagnosticQuestion {
  id: string
  prompt: string
  options: string[]
  correctOptionIndex: number
  skillIds: string[]
  competencyIds: string[]
  difficulty: DiagnosticDifficulty
  estimatedSeconds: number
}

export interface DiagnosticQuestionSource {
  id: string
  question: string
  options: string[]
  correct: number
  skillIds?: string[]
  competencyIds?: string[]
  difficulty?: DiagnosticDifficulty
  estimatedSeconds?: number
  category?: string
}

export interface DiagnosticSkill {
  id: string
  name: string
  competencyIds: string[]
  targetScore?: number
  weight?: number
}

export interface DiagnosticCompetency {
  id: string
  name: string
  skillIds: string[]
  targetScore?: number
  weight?: number
}

export interface DiagnosticGraph {
  skills: DiagnosticSkill[]
  competencies: DiagnosticCompetency[]
}

export interface DiagnosticConfiguration {
  minQuestions: number
  maxQuestions: number
  targetCoverage: number
  initialDifficulty: DiagnosticDifficulty
  estimatedMinutesGoal: number
  targetScore: number
}

export interface DiagnosticAnswer {
  questionId: string
  selectedOptionIndex: number
  correct: boolean
  difficulty: DiagnosticDifficulty
  skillIds: string[]
  competencyIds: string[]
  answeredAt: number
  durationSeconds: number
}

export interface DiagnosticSession {
  version: 1
  id: string
  userId: string
  startedAt: number
  completedAt: number | null
  abilityEstimate: number
  answers: DiagnosticAnswer[]
  presentedQuestionIds: string[]
  currentQuestionId: string | null
}

export interface PresentedDiagnosticQuestion {
  session: DiagnosticSession
  question: DiagnosticQuestion
}

export interface SkillAssessment {
  skillId: string
  name: string
  score: number | null
  targetScore: number
  confidence: number
  evidenceCount: number
  gap: number
  priority: number
  status: 'strength' | 'developing' | 'weakness' | 'not-assessed'
}

export interface CompetencyAssessment {
  competencyId: string
  name: string
  score: number | null
  confidence: number
  coverage: number
  evidenceCount: number
  status: 'strength' | 'developing' | 'weakness' | 'not-assessed'
  skillAssessments: SkillAssessment[]
}

export type ReadinessLevel = 'ready' | 'nearly-ready' | 'developing' | 'foundation' | 'insufficient-evidence'

export interface CurrentReadiness {
  score: number | null
  level: ReadinessLevel
  confidence: number
  coverage: number
  assessedSkills: number
  totalSkills: number
  assessedQuestions: number
  summary: string
}

export interface SkillGap {
  skillId: string
  name: string
  competencyIds: string[]
  currentScore: number | null
  targetScore: number
  gap: number
  confidence: number
  reason: 'not-assessed' | 'below-target' | 'low-confidence'
  priority: number
}

export interface LearningPathStep {
  step: number
  skillId: string
  competencyIds: string[]
  title: string
  reason: string
  priority: number
  estimatedMinutes: number
  recommendedQuestionIds: string[]
}

export interface DiagnosticReport {
  version: 1
  sessionId: string
  userId: string
  generatedAt: number
  durationSeconds: number
  algorithmVersion: 'adaptive-diagnostic-v1'
  currentReadiness: CurrentReadiness
  competencyAnalysis: CompetencyAssessment[]
  topStrengths: SkillAssessment[]
  topWeaknesses: SkillAssessment[]
  skillGaps: SkillGap[]
  learningPath: LearningPathStep[]
}
