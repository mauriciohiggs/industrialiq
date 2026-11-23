import { questions } from '../data/bank'
import { DAY } from '../lib/study'
import type { Progress, Rating } from '../types'
import { calculateCompetencyIntelligence, type IntelligenceResult, type SkillEvidence } from './competencyEngine'
import { categorySkillIds, industrialGraph } from './industrialGraph'

const flashcardScores: Record<Rating, number> = {
  again: 20,
  hard: 50,
  good: 80,
  easy: 100,
}

function questionEvidence(progress: Progress): SkillEvidence[] {
  const questionById = new Map(questions.map((question) => [question.id, question]))
  return progress.answers.flatMap((answer, index) => {
    const question = questionById.get(answer.questionId)
    if (!question) return []
    const explicitSkills = question.skillIds?.filter((skillId) => industrialGraph.skills.some((skill) => skill.id === skillId)) ?? []
    const skillIds = explicitSkills.length ? explicitSkills : [categorySkillIds[question.category]]
    return [{
      id: `question:${answer.questionId}:${answer.at}:${index}`,
      sourceType: 'question' as const,
      sourceId: answer.questionId,
      observedAt: answer.at,
      score: answer.correct ? 100 : 0,
      skillWeights: skillIds.map((skillId) => ({ skillId, weight: 1 / skillIds.length })),
    }]
  })
}

function flashcardEvidence(progress: Progress): SkillEvidence[] {
  const questionById = new Map(questions.map((question) => [question.id, question]))
  return Object.entries(progress.cards).flatMap(([questionId, card]) => {
    const question = questionById.get(questionId)
    if (!question) return []
    return [{
      id: `flashcard:${questionId}:${card.reviews}`,
      sourceType: 'flashcard' as const,
      sourceId: questionId,
      observedAt: Math.max(0, card.due - card.interval * DAY),
      score: flashcardScores[card.rating],
      skillWeights: [{ skillId: categorySkillIds[question.category], weight: 1 }],
    }]
  })
}

export function learningEvidence(progress: Progress) {
  return [...questionEvidence(progress), ...flashcardEvidence(progress)]
}

export function calculateIndustrialIntelligence(progress: Progress, now: number): IntelligenceResult {
  return calculateCompetencyIntelligence(industrialGraph, learningEvidence(progress), now, {
    coverageReferencePoints: 6,
    readinessCoverage: 0.2,
    readinessConfidence: 0.08,
    sourceDiversityTarget: 2,
  })
}
