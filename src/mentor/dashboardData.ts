import type { Progress } from '../types'
import { calculateIndustrialIntelligence, learningEvidence } from '../analytics/industrialIntelligence'
import { careerNames, competencyNames, skillCategories } from '../analytics/industrialGraph'
import type { MentorDashboardData, MentorSkill, MentorTask } from './models'

export function mentorDashboardData(progress: Progress, now: number): MentorDashboardData {
  const intelligence = calculateIndustrialIntelligence(progress, now)
  const evidence = learningEvidence(progress)
  const answerEvidence = evidence.filter((item) => item.sourceType === 'question')
  const skills: MentorSkill[] = intelligence.skills.map((skill) => {
    const name = skillCategories[skill.skillId]
    const skillAnswers = answerEvidence.filter((item) => item.skillWeights.some((mapping) => mapping.skillId === skill.skillId))
    const correct = skillAnswers.filter((item) => item.score === 100).length
    return {
      id: skill.skillId,
      name,
      score: skill.score,
      answered: skillAnswers.length,
      coverage: Math.round(skill.coverage * 100),
      trend: skillAnswers.length >= 4
        ? Math.min(8, Math.max(-8, Math.round((correct - skillAnswers.length / 2) / skillAnswers.length * 12)))
        : null,
    }
  })
  const skillById = new Map(skills.map((skill) => [skill.id, skill]))
  const strengths = intelligence.skills
    .filter((skill) => skill.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((skill) => skillById.get(skill.skillId)!)
  const assessedWeaknessIds = new Set(
    intelligence.skills.filter((skill) => skill.score !== null).map((skill) => skill.skillId),
  )
  const weaknesses = [...intelligence.weaknesses]
    .sort((a, b) => Number(assessedWeaknessIds.has(b.skillId)) - Number(assessedWeaknessIds.has(a.skillId)) || b.priority - a.priority)
    .slice(0, 3)
    .map((weakness) => skillById.get(weakness.skillId)!)
  const certification = intelligence.certifications[0]
  const readiness = certification?.score ?? null
  const evidenceCount = progress.answers.length
  const coverage = Math.round((certification?.coverage ?? 0) * 100)
  const focus = weaknesses[0] ?? strengths[0] ?? skills[0]
  const second = weaknesses[1] ?? strengths[1] ?? skills.find((skill) => skill.id !== focus.id) ?? skills[1]
  const tasks: MentorTask[] = [
    {
      id: 'weak-area',
      title: `${focus.name} focus drill`,
      description: focus.score === null ? 'Establish your baseline with a quick practice set.' : `Build on your ${focus.score}% recent accuracy.`,
      category: focus.name,
      duration: '8 min',
      xp: 20,
      kind: 'practice',
    },
    {
      id: 'spaced-review',
      title: 'Daily recall session',
      description: 'Review new and due cards while they are fresh.',
      category: 'All topics',
      duration: '10 min',
      xp: 25,
      kind: 'review',
    },
    {
      id: 'confidence',
      title: `${second.name} confidence check`,
      description: 'A short assessment to strengthen your evidence.',
      category: second.name,
      duration: '6 min',
      xp: 15,
      kind: 'practice',
    },
  ]
  const recommendedAction = focus.name === 'Security'
    ? 'Review Security flashcards'
    : `Review ${focus.name} flashcards and complete a practice drill`
  const estimatedImprovement = Math.min(8, Math.max(2, Math.round((100 - (focus.score ?? 0)) / 15)))
  const start = new Date(now)
  const studyPlan = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      title: index === 0 ? focus.name : index === 1 ? 'Mixed recall' : index === 3 ? second.name : index === 5 ? 'Weekly check' : 'Core review',
      minutes: index === 5 ? 25 : index === 0 ? 15 : 10,
      state: index === 0 ? 'today' as const : 'upcoming' as const,
    }
  })
  const coachingResources = tasks.map((task) => ({
    id: task.id,
    name: task.title,
    type: task.kind === 'review' ? 'flashcards' as const : task.kind,
    quantity: task.kind === 'review' ? Math.min(12, Object.keys(progress.cards).length || 12) : 1,
    taskId: task.id,
    estimatedReadinessGainPercent: null,
  }))
  return {
    readiness,
    confidence: certification?.status === 'ready' ? 'ready' : evidenceCount >= 6 ? 'building' : 'insufficient',
    evidenceCount,
    coverage,
    skills,
    strengths,
    weaknesses,
    certifications: intelligence.certifications.map((item) => ({
      id: item.certificationId,
      name: 'Ignition Core Practice Readiness',
      score: item.score,
      status: item.status,
    })),
    careers: intelligence.careerPaths.map((item) => ({
      id: item.careerPathId,
      name: careerNames[item.careerPathId],
      score: item.score,
      status: item.status,
    })),
    summary: {
      readiness,
      topStrength: strengths[0]?.name ?? null,
      biggestGap: weaknesses[0]?.name ?? null,
      recommendedAction,
      estimatedImprovement,
    },
    tasks,
    studyPlan,
    forecastDays: readiness !== null && readiness >= 55 && coverage >= 35 ? Math.max(7, Math.round((100 - readiness) * 0.8)) : null,
    coachingInput: {
      readiness,
      competencies: intelligence.competencies
        .filter((competency) => competency.score !== null)
        .map((competency) => ({
          name: competencyNames[competency.competencyId],
          score: competency.score!,
        })),
      careerReadiness: intelligence.careerPaths
        .map((career) => ({
          name: careerNames[career.careerPathId],
          score: career.score,
        })),
      weakAreas: intelligence.weaknesses
        .slice(0, 3)
        .map((weakness) => ({
          name: skillById.get(weakness.skillId)!.name,
          score: weakness.priority,
        })),
      targetLearningPath: 'Ignition Core',
      availableResources: coachingResources,
    },
  }
}
