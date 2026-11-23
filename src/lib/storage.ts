import { emptyProgress } from './study'
import type { Progress } from '../types'

export const STORAGE_KEY = 'ignition-open-study-v1'
const ratings = ['again', 'hard', 'good', 'easy']
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

function assertProgress(data: unknown): asserts data is Progress {
  if (!record(data) || data.version !== 1 || !record(data.cards) || !Array.isArray(data.answers) || !Array.isArray(data.activity)) {
    throw new Error('Unrecognized progress format. Expected version 1.')
  }
  for (const card of Object.values(data.cards)) {
    if (!record(card) || !finite(card.due) || !finite(card.interval) || card.interval < 1 ||
      !finite(card.reviews) || !Number.isInteger(card.reviews) || card.reviews < 1 ||
      typeof card.rating !== 'string' || !ratings.includes(card.rating)) throw new Error('Invalid flashcard progress.')
  }
  for (const answer of data.answers) {
    if (!record(answer) || typeof answer.questionId !== 'string' || typeof answer.correct !== 'boolean' || !finite(answer.at)) {
      throw new Error('Invalid answer history.')
    }
  }
  if (data.activity.some((day) => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(Date.parse(`${day}T12:00:00Z`)) || new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day)) {
    throw new Error('Invalid study activity dates.')
  }
}

export function parseProgress(raw: string): Progress {
  const data: unknown = JSON.parse(raw)
  assertProgress(data)
  return data
}

export function loadProgress(): { progress: Progress; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { progress: raw ? parseProgress(raw) : emptyProgress(), error: null }
  } catch (error) {
    return {
      progress: emptyProgress(),
      error: `Saved progress could not be loaded: ${error instanceof Error ? error.message : String(error)}. Your existing data has not been overwritten. Export it or explicitly reset progress before saving new work.`,
    }
  }
}
