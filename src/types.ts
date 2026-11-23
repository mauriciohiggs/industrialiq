export type Category = 'Gateway' | 'Vision' | 'Perspective' | 'Tags' | 'Security' | 'Reporting' | 'Historian' | 'Transaction Groups' | 'Alarming'
export type Rating = 'again' | 'hard' | 'good' | 'easy'
export type StudyFilter = Category | 'All topics' | 'Missed questions'

export interface Question {
  id: string
  skillIds?: string[]
  category: Category
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface CardProgress {
  due: number
  interval: number
  reviews: number
  rating: Rating
}

export interface Answer {
  questionId: string
  correct: boolean
  at: number
}

export interface Progress {
  version: 1
  cards: Record<string, CardProgress>
  answers: Answer[]
  activity: string[]
}

export interface QuizQuestion extends Question {
  choices: { text: string; originalIndex: number }[]
}

export interface QuizSession {
  questions: QuizQuestion[]
  selections: Record<string, number>
  index: number
  mode: 'practice' | 'exam'
  deadline: number | null
  revealed: boolean
}
