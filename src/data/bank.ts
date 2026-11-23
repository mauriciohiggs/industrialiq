import raw from './questions.json'
import type { Question } from '../types'
import { categories } from './categories'

export function validateBank(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Question bank must be a non-empty array.')
  const ids = new Set<string>()
  for (const item of value) {
    if (
      !item || typeof item !== 'object' ||
      typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) ||
      (item.skillIds !== undefined && (!Array.isArray(item.skillIds) || item.skillIds.some((id: unknown) => typeof id !== 'string' || !id.trim()) || new Set(item.skillIds).size !== item.skillIds.length)) ||
      !categories.some((category) => category.name === item.category) ||
      typeof item.question !== 'string' || !item.question.trim() ||
      typeof item.explanation !== 'string' || !item.explanation.trim() ||
      !Array.isArray(item.options) || item.options.length !== 4 ||
      item.options.some((option: unknown) => typeof option !== 'string' || !option.trim()) ||
      new Set(item.options).size !== item.options.length ||
      !Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length
    ) throw new Error(`Invalid or duplicate question: ${String(item?.id ?? 'unknown')}`)
    ids.add(item.id)
  }
  return value
}

export const questions = validateBank(raw)
