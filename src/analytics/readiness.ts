import type { Certification, Competency, Skill } from '../competencies/models'

export interface SkillScore {
  skillId: string
  score: number
}

export interface ReadinessResult {
  overallScore: number | null
  competencyScores: { competencyId: string; score: number | null }[]
  certificationReadiness: { certificationId: string; score: number | null }[]
  recommendedSkills: string[]
  weakAreas: string[]
}

function averageComplete(scores: (number | null)[]): number | null {
  if (!scores.length || scores.some((score) => score === null)) return null
  return Math.round(scores.reduce<number>((sum, score) => sum + (score ?? 0), 0) / scores.length)
}

// Illustrative practice summaries only; these do not predict certification outcomes.
export function calculateReadiness(
  skills: Skill[],
  competencies: Competency[],
  certifications: Certification[],
  skillScores: SkillScore[],
): ReadinessResult {
  const skillIds = new Set(skills.map((skill) => skill.id))
  const competencyIds = new Set(competencies.map((competency) => competency.id))
  if (skillIds.size !== skills.length || competencyIds.size !== competencies.length ||
    new Set(certifications.map((certification) => certification.id)).size !== certifications.length) {
    throw new Error('Graph IDs must be unique within each entity type.')
  }
  const scores = new Map<string, number>()
  for (const { skillId, score } of skillScores) {
    if (!skillIds.has(skillId) || scores.has(skillId) || !Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(`Invalid or duplicate skill score: ${skillId}`)
    }
    scores.set(skillId, score)
  }
  for (const competency of competencies) {
    if (new Set(competency.skillIds).size !== competency.skillIds.length || competency.skillIds.some((id) => !skillIds.has(id))) {
      throw new Error(`Invalid skills for competency: ${competency.id}`)
    }
  }
  for (const certification of certifications) {
    if (new Set(certification.competencyIds).size !== certification.competencyIds.length || certification.competencyIds.some((id) => !competencyIds.has(id))) {
      throw new Error(`Invalid competencies for certification: ${certification.id}`)
    }
  }
  const competencyScores = competencies.map((competency) => ({
    competencyId: competency.id,
    score: averageComplete(competency.skillIds.map((id) => scores.get(id) ?? null)),
  }))
  const byCompetency = new Map(competencyScores.map(({ competencyId, score }) => [competencyId, score]))
  const certificationReadiness = certifications.map((certification) => ({
    certificationId: certification.id,
    score: averageComplete(certification.competencyIds.map((id) => byCompetency.get(id) ?? null)),
  }))
  const weakAreas = skills.filter((skill) => scores.has(skill.id) && scores.get(skill.id)! < 70).map((skill) => skill.id)
  return {
    overallScore: averageComplete(competencyScores.map(({ score }) => score)),
    competencyScores,
    certificationReadiness,
    recommendedSkills: skills.filter((skill) => !scores.has(skill.id) || weakAreas.includes(skill.id)).map((skill) => skill.id),
    weakAreas,
  }
}
