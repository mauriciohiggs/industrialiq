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
