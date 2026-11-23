import type { Answer, CardProgress, Progress, Question, QuizQuestion, Rating, StudyFilter } from '../types'

export const DAY = 86_400_000
export const emptyProgress = (): Progress => ({ version: 1, cards: {}, answers: [], activity: [] })

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function latestAnswers(answers: Answer[]) {
  return new Map(answers.map((answer) => [answer.questionId, answer.correct]))
}

export function filterBank(bank: Question[], filter: StudyFilter, progress: Progress) {
  if (filter === 'All topics') return bank
  if (filter === 'Missed questions') {
    const latest = latestAnswers(progress.answers)
    return bank.filter((question) => latest.get(question.id) === false)
  }
  return bank.filter((question) => question.category === filter)
}

export function createQuiz(bank: Question[], count: number): QuizQuestion[] {
  return shuffle(bank).slice(0, count).map((question) => ({
    ...question,
    choices: shuffle(question.options.map((text, originalIndex) => ({ text, originalIndex }))),
  }))
}

export function gradeQuiz(bank: Question[], selections: Record<string, number>, at: number) {
  const answers = bank.map((question) => ({
    questionId: question.id, correct: selections[question.id] === question.correct, at,
  }))
  const correct = answers.filter((answer) => answer.correct).length
  return { answers, correct, total: bank.length, percentage: bank.length ? Math.round(correct / bank.length * 100) : 0 }
}

export function scheduleCard(previous: CardProgress | undefined, rating: Rating, now: number): CardProgress {
  const initial: Record<Rating, number> = { again: 1, hard: 3, good: 7, easy: 21 }
  const factor: Record<Rating, number> = { again: 0, hard: 1.2, good: 2, easy: 2.5 }
  const interval = rating === 'again' ? 1 : Math.max(initial[rating], Math.round((previous?.interval ?? 0) * factor[rating]))
  return { due: now + interval * DAY, interval, reviews: (previous?.reviews ?? 0) + 1, rating }
}

export function categoryStats(bank: Question[], progress: Progress, category?: string) {
  const ids = new Set(bank.filter((question) => !category || question.category === category).map((question) => question.id))
  const answers = progress.answers.slice(-200).filter((answer) => ids.has(answer.questionId))
  const correct = answers.filter((answer) => answer.correct).length
  return { total: answers.length, correct, accuracy: answers.length ? Math.round(correct / answers.length * 100) : null }
}

export function reviewQueue(bank: Question[], progress: Progress, now: number, ahead = false) {
  const latest = latestAnswers(progress.answers)
  const weakness = new Map([...new Set(bank.map((question) => question.category))].map((category) => [
    category, categoryStats(bank, progress, category).accuracy ?? 50,
  ]))
  return shuffle(bank)
    .filter((question) => ahead || !progress.cards[question.id] || progress.cards[question.id].due <= now)
    .sort((a, b) => {
      const priority = (question: Question) => {
        const card = progress.cards[question.id]
        return (card && card.due <= now ? 1000 : 0) +
          (latest.get(question.id) === false ? 200 : 0) +
          (100 - (weakness.get(question.category) ?? 50))
      }
      return priority(b) - priority(a)
    })
}

export function localDate(now: number) {
  const date = new Date(now)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addActivity(progress: Progress, now: number): string[] {
  return [...new Set([...progress.activity, localDate(now)])].sort()
}

export function streak(activity: string[], now: number) {
  const days = new Set(activity)
  const date = new Date(now)
  if (!days.has(localDate(date.getTime()))) date.setDate(date.getDate() - 1)
  let count = 0
  while (days.has(localDate(date.getTime()))) {
    count++
    date.setDate(date.getDate() - 1)
  }
  return count
}
