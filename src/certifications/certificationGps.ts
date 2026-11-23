import { calculateIndustrialIntelligence } from '../analytics/industrialIntelligence'
import { industrialGraph, skillCategories } from '../analytics/industrialGraph'
import type { Progress } from '../types'
import { forecastCertification } from './gpsForecast'
import type { CertificationGps, CertificationGpsAssessment } from './gpsModels'
import { estimateStudyDistance, planAlternativeRoute, planFastestRoute, planRoadblocks } from './gpsPlanner'

export function certificationGpsAssessment(progress: Progress, now: number): CertificationGpsAssessment {
  const intelligence = calculateIndustrialIntelligence(progress, now)
  const certification = intelligence.certifications[0]
  const weaknessById = new Map(intelligence.weaknesses.map((weakness) => [weakness.skillId, weakness.priority]))
  const targetReadiness = industrialGraph.certifications[0]?.masteryThreshold ?? 80
  return {
    certificationId: certification?.certificationId ?? industrialGraph.certifications[0]?.id ?? 'certification',
    certificationName: 'Ignition Core Certification',
    readiness: certification?.score ?? null,
    coverage: certification?.coverage ?? 0,
    targetReadiness,
    skills: intelligence.skills.map((skill) => ({
      id: skill.skillId,
      name: skillCategories[skill.skillId],
      score: skill.score,
      coverage: skill.coverage,
      priority: weaknessById.get(skill.skillId) ?? 0,
    })),
  }
}

export function buildCertificationGps(progress: Progress, now: number): CertificationGps {
  const assessment = certificationGpsAssessment(progress, now)
  const distanceRemainingHours = estimateStudyDistance(assessment)
  return {
    currentLocation: assessment.readiness,
    destination: assessment.certificationName,
    distanceRemainingHours,
    roadblocks: planRoadblocks(assessment),
    fastestRoute: planFastestRoute(assessment),
    alternativeRoute: planAlternativeRoute(),
    forecast: forecastCertification(assessment.readiness, assessment.coverage, distanceRemainingHours),
  }
}
