import type { StudyFilter } from '../types'
import type {
  CertificationGpsAssessment,
  CertificationGpsSkill,
  GpsPlannerOptions,
  GpsRoadblock,
  GpsRouteStep,
} from './gpsModels'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const round = (value: number, precision = 1) => Math.round(value * (10 ** precision)) / (10 ** precision)

function rankedRoadblocks(assessment: CertificationGpsAssessment): CertificationGpsSkill[] {
  return [...assessment.skills].sort((a, b) => {
    const aGap = a.score === null ? 100 : Math.max(0, assessment.targetReadiness - a.score)
    const bGap = b.score === null ? 100 : Math.max(0, assessment.targetReadiness - b.score)
    const aRank = aGap + a.priority + (1 - a.coverage) * 35
    const bRank = bGap + b.priority + (1 - b.coverage) * 35
    return bRank - aRank || a.name.localeCompare(b.name)
  })
}

export function planRoadblocks(
  assessment: CertificationGpsAssessment,
  options: GpsPlannerOptions = {},
): GpsRoadblock[] {
  const maximum = Math.max(1, options.maximumRoadblocks ?? 2)
  return rankedRoadblocks(assessment).slice(0, maximum).map((skill) => ({
    skillId: skill.id,
    name: skill.name,
    score: skill.score,
    priority: round(skill.priority),
  }))
}

function step(
  skill: CertificationGpsSkill,
  index: number,
  kind: GpsRouteStep['kind'],
  title: string,
  description: string,
  durationMinutes: number,
): GpsRouteStep {
  const gap = skill.score === null ? 45 : Math.max(0, 80 - skill.score)
  return {
    id: `${kind}-${skill.id}-${index}`,
    title,
    description,
    kind,
    filter: skill.name as StudyFilter,
    durationMinutes,
    expectedGainPercent: round(Math.max(1, Math.min(8, gap * 0.12))),
  }
}

export function planFastestRoute(assessment: CertificationGpsAssessment): GpsRouteStep[] {
  const [primary, secondary] = rankedRoadblocks(assessment)
  if (!primary) return []
  const route = [
    step(primary, 1, 'flashcards', `${primary.name} Flashcards`, `Rebuild recall around your highest-priority gap.`, 20),
  ]
  if (secondary) {
    route.push(step(
      secondary,
      2,
      'practice',
      `${secondary.name} Quiz`,
      `Turn the next roadblock into assessed evidence.`,
      15,
    ))
  }
  const moduleName = primary.name === 'Security' ? 'Security Zones Module' : `${primary.name} Module`
  route.push(step(
    primary,
    3,
    'module',
    moduleName,
    `Close the remaining knowledge gap with focused learning.`,
    30,
  ))
  return route
}

export function planAlternativeRoute(): GpsRouteStep[] {
  return [{
    id: 'full-practice-exam',
    title: 'Full Practice Exam',
    description: 'A complete baseline across every certification topic.',
    kind: 'exam',
    filter: 'All topics',
    durationMinutes: 90,
    expectedGainPercent: 0,
  }]
}

export function estimateStudyDistance(assessment: CertificationGpsAssessment): number {
  const readiness = assessment.readiness ?? 0
  const scoreGap = Math.max(0, assessment.targetReadiness - readiness)
  const coverageHours = Math.max(0, 1 - assessment.coverage) * 3
  const priorityHours = planRoadblocks(assessment).reduce((total, roadblock) => {
    const skillGap = roadblock.score === null ? 40 : Math.max(0, assessment.targetReadiness - roadblock.score)
    return total + skillGap * 0.045
  }, 0)
  return round(clamp(scoreGap * 0.16 + coverageHours + priorityHours, 0.5, 40))
}
