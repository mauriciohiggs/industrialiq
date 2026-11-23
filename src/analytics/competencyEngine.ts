import { DAY } from '../lib/study'

export type EvidenceSource = 'question' | 'flashcard' | 'exam' | 'module'
export type MasteryStatus = 'no-evidence' | 'weak' | 'developing' | 'mastered'
export type ReadinessStatus = 'insufficient-evidence' | 'not-ready' | 'nearly-ready' | 'ready'

export interface SkillEvidence {
  id: string
  sourceType: EvidenceSource
  sourceId: string
  observedAt: number
  score: number
  skillWeights: { skillId: string; weight: number }[]
  confidence?: number
  qualityWeight?: number
}

export interface IntelligenceSkill {
  id: string
  masteryThreshold?: number
  decayHalfLifeDays?: number
}

export interface WeightedSkill {
  skillId: string
  weight: number
}

export interface IntelligenceCompetency {
  id: string
  skills: WeightedSkill[]
  minimumTarget?: number
}

export interface IntelligenceCertification {
  id: string
  competencies: { competencyId: string; weight: number }[]
  masteryThreshold?: number
  minimumCoverage?: number
  minimumConfidence?: number
}

export interface IntelligenceCareerPath {
  id: string
  competencies: { competencyId: string; target: number; weight: number }[]
  minimumCoverage?: number
  minimumConfidence?: number
}

export interface EngineConfiguration {
  evidenceReliability: Record<EvidenceSource, number>
  defaultHalfLifeDays: number
  coverageReferencePoints: number
  masteryThreshold: number
  nearReadyThreshold: number
  readinessCoverage: number
  readinessConfidence: number
  sourceDiversityTarget: number
}

export interface SkillMastery {
  skillId: string
  score: number | null
  unweightedScore: number | null
  coverage: number
  confidence: number
  decayLoss: number
  evidenceCount: number
  lastObservedAt: number | null
  status: MasteryStatus
}

export interface CompetencyMastery {
  competencyId: string
  score: number | null
  coverage: number
  confidence: number
  weakSkillIds: string[]
  missingSkillIds: string[]
}

export interface CertificationReadiness {
  certificationId: string
  score: number | null
  coverage: number
  confidence: number
  status: ReadinessStatus
  blockingCompetencyIds: string[]
}

export interface CareerReadiness {
  careerPathId: string
  score: number | null
  coverage: number
  confidence: number
  status: ReadinessStatus
  blockingCompetencyIds: string[]
}

export interface Weakness {
  skillId: string
  priority: number
  reason: 'no-evidence' | 'low-mastery' | 'low-confidence' | 'knowledge-decay'
}

export interface ReviewCandidate {
  id: string
  skillIds: string[]
  dueAt: number
  intervalDays: number
}

export interface ReviewPriority {
  id: string
  priority: number
  overdueDays: number
  weakestSkillId: string | null
}

export interface IntelligenceResult {
  skills: SkillMastery[]
  competencies: CompetencyMastery[]
  certifications: CertificationReadiness[]
  careerPaths: CareerReadiness[]
  weaknesses: Weakness[]
}

export const DEFAULT_ENGINE_CONFIGURATION: EngineConfiguration = {
  evidenceReliability: {
    question: 0.8,
    flashcard: 0.25,
    exam: 1,
    module: 0.5,
  },
  defaultHalfLifeDays: 90,
  coverageReferencePoints: 6,
  masteryThreshold: 80,
  nearReadyThreshold: 70,
  readinessCoverage: 0.8,
  readinessConfidence: 0.65,
  sourceDiversityTarget: 4,
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const round = (value: number) => Math.round(value * 10) / 10

function validateWeights(items: { skillId?: string; competencyId?: string; weight: number }[], owner: string) {
  const ids = items.map((item) => item.skillId ?? item.competencyId)
  if (new Set(ids).size !== ids.length || items.some((item) => !Number.isFinite(item.weight) || item.weight <= 0)) {
    throw new Error(`Invalid mapping weights for: ${owner}`)
  }
}

function validateInputs(
  skills: IntelligenceSkill[],
  competencies: IntelligenceCompetency[],
  certifications: IntelligenceCertification[],
  careerPaths: IntelligenceCareerPath[],
  evidence: SkillEvidence[],
) {
  const skillIds = new Set(skills.map(({ id }) => id))
  const competencyIds = new Set(competencies.map(({ id }) => id))
  if (skillIds.size !== skills.length || competencyIds.size !== competencies.length ||
    new Set(certifications.map(({ id }) => id)).size !== certifications.length ||
    new Set(careerPaths.map(({ id }) => id)).size !== careerPaths.length) {
    throw new Error('Graph IDs must be unique within each entity type.')
  }
  if (skills.some(({ decayHalfLifeDays, masteryThreshold }) =>
    (decayHalfLifeDays !== undefined && decayHalfLifeDays <= 0) ||
    (masteryThreshold !== undefined && (masteryThreshold < 0 || masteryThreshold > 100)))) {
    throw new Error('Skill scoring configuration is invalid.')
  }
  for (const competency of competencies) {
    validateWeights(competency.skills, competency.id)
    if (competency.skills.some(({ skillId }) => !skillIds.has(skillId))) {
      throw new Error(`Unknown skill mapped to competency: ${competency.id}`)
    }
  }
  for (const certification of certifications) {
    validateWeights(certification.competencies, certification.id)
    if (certification.competencies.some(({ competencyId }) => !competencyIds.has(competencyId))) {
      throw new Error(`Unknown competency mapped to certification: ${certification.id}`)
    }
  }
  for (const careerPath of careerPaths) {
    validateWeights(careerPath.competencies, careerPath.id)
    if (careerPath.competencies.some(({ competencyId }) => !competencyIds.has(competencyId))) {
      throw new Error(`Unknown competency mapped to career path: ${careerPath.id}`)
    }
  }
  const eventIds = new Set<string>()
  for (const event of evidence) {
    if (eventIds.has(event.id) || !Number.isFinite(event.observedAt) || !Number.isFinite(event.score) ||
      event.score < 0 || event.score > 100 || event.skillWeights.length === 0 ||
      (event.confidence !== undefined && (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)) ||
      (event.qualityWeight !== undefined && (!Number.isFinite(event.qualityWeight) || event.qualityWeight <= 0))) {
      throw new Error(`Invalid evidence event: ${event.id}`)
    }
    eventIds.add(event.id)
    validateWeights(event.skillWeights, event.id)
    if (event.skillWeights.some(({ skillId }) => !skillIds.has(skillId))) {
      throw new Error(`Evidence references an unknown skill: ${event.id}`)
    }
  }
}

function calculateSkillScores(
  skills: IntelligenceSkill[],
  evidence: SkillEvidence[],
  now: number,
  config: EngineConfiguration,
): SkillMastery[] {
  return skills.map((skill) => {
    const events = evidence.flatMap((event) => event.skillWeights
      .filter(({ skillId }) => skillId === skill.id)
      .map((mapping) => ({ event, mapping })))
    if (!events.length) {
      return {
        skillId: skill.id,
        score: null,
        unweightedScore: null,
        coverage: 0,
        confidence: 0,
        decayLoss: 0,
        evidenceCount: 0,
        lastObservedAt: null,
        status: 'no-evidence',
      }
    }

    const repetitions = new Map<string, number>()
    let weightedScore = 0
    let retainedScore = 0
    let totalWeight = 0
    let retainedWeight = 0
    let lastObservedAt = Number.NEGATIVE_INFINITY
    const sourceTypes = new Set<EvidenceSource>()
    for (const { event, mapping } of [...events].sort((a, b) => b.event.observedAt - a.event.observedAt)) {
      const sourceKey = `${event.sourceType}:${event.sourceId}`
      const repetition = repetitions.get(sourceKey) ?? 0
      repetitions.set(sourceKey, repetition + 1)
      const repetitionWeight = Math.pow(0.5, repetition)
      const halfLife = skill.decayHalfLifeDays ?? config.defaultHalfLifeDays
      const ageDays = Math.max(0, (now - event.observedAt) / DAY)
      const retention = Math.pow(0.5, ageDays / halfLife)
      const baseWeight = mapping.weight *
        config.evidenceReliability[event.sourceType] *
        (event.confidence ?? 1) *
        (event.qualityWeight ?? 1) *
        repetitionWeight
      weightedScore += event.score * baseWeight
      retainedScore += event.score * baseWeight * retention
      totalWeight += baseWeight
      retainedWeight += baseWeight * retention
      sourceTypes.add(event.sourceType)
      lastObservedAt = Math.max(lastObservedAt, event.observedAt)
    }
    const unweightedScore = totalWeight ? weightedScore / totalWeight : 0
    const score = totalWeight ? retainedScore / totalWeight : 0
    const coverage = clamp(retainedWeight / config.coverageReferencePoints, 0, 1)
    const diversity = clamp(sourceTypes.size / config.sourceDiversityTarget, 0, 1)
    const confidence = coverage * (0.5 + diversity * 0.5)
    const threshold = skill.masteryThreshold ?? config.masteryThreshold
    const status: MasteryStatus = score < config.nearReadyThreshold ? 'weak' :
      score < threshold || coverage < config.readinessCoverage ? 'developing' : 'mastered'
    return {
      skillId: skill.id,
      score: round(score),
      unweightedScore: round(unweightedScore),
      coverage: round(coverage),
      confidence: round(confidence),
      decayLoss: round(Math.max(0, unweightedScore - score)),
      evidenceCount: events.length,
      lastObservedAt,
      status,
    }
  })
}

function aggregateCompetencies(
  competencies: IntelligenceCompetency[],
  skills: SkillMastery[],
): CompetencyMastery[] {
  const skillById = new Map(skills.map((skill) => [skill.skillId, skill]))
  return competencies.map((competency) => {
    const weighted = competency.skills.map(({ skillId, weight }) => ({
      skill: skillById.get(skillId)!,
      weight,
      skillId,
    }))
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
    const evidenced = weighted.filter(({ skill }) => skill.score !== null)
    const evidencedWeight = evidenced.reduce((sum, item) => sum + item.weight, 0)
    const score = evidencedWeight
      ? evidenced.reduce((sum, item) => sum + item.skill.score! * item.weight, 0) / evidencedWeight
      : null
    const confidence = totalWeight
      ? weighted.reduce((sum, item) => sum + item.skill.confidence * item.weight, 0) / totalWeight
      : 0
    return {
      competencyId: competency.id,
      score: score === null ? null : round(score),
      coverage: totalWeight ? round(evidencedWeight / totalWeight) : 0,
      confidence: round(confidence),
      weakSkillIds: weighted.filter(({ skill }) =>
        skill.status === 'weak' || (competency.minimumTarget !== undefined && (skill.score ?? 0) < competency.minimumTarget))
        .map(({ skillId }) => skillId),
      missingSkillIds: weighted.filter(({ skill }) => skill.score === null).map(({ skillId }) => skillId),
    }
  })
}

function readinessStatus(
  score: number | null,
  coverage: number,
  confidence: number,
  threshold: number,
  config: EngineConfiguration,
): ReadinessStatus {
  if (score === null || coverage < config.readinessCoverage || confidence < config.readinessConfidence) return 'insufficient-evidence'
  if (score >= threshold) return 'ready'
  if (score >= config.nearReadyThreshold) return 'nearly-ready'
  return 'not-ready'
}

export function calculateCompetencyIntelligence(
  graph: {
    skills: IntelligenceSkill[]
    competencies: IntelligenceCompetency[]
    certifications?: IntelligenceCertification[]
    careerPaths?: IntelligenceCareerPath[]
  },
  evidence: SkillEvidence[],
  now: number,
  configuration: Partial<EngineConfiguration> = {},
): IntelligenceResult {
  if (!Number.isFinite(now)) throw new Error('The calculation time must be finite.')
  const config: EngineConfiguration = { ...DEFAULT_ENGINE_CONFIGURATION, ...configuration }
  const certifications = graph.certifications ?? []
  const careerPaths = graph.careerPaths ?? []
  validateInputs(graph.skills, graph.competencies, certifications, careerPaths, evidence)
  const skills = calculateSkillScores(graph.skills, evidence, now, config)
  const competencies = aggregateCompetencies(graph.competencies, skills)
  const competencyById = new Map(competencies.map((competency) => [competency.competencyId, competency]))

  const certificationReadiness = certifications.map((certification): CertificationReadiness => {
    const totalWeight = certification.competencies.reduce((sum, item) => sum + item.weight, 0)
    const evidenced = certification.competencies
      .map((item) => ({ ...item, competency: competencyById.get(item.competencyId)! }))
      .filter(({ competency }) => competency.score !== null)
    const evidencedWeight = evidenced.reduce((sum, item) => sum + item.weight, 0)
    const score = evidencedWeight
      ? evidenced.reduce((sum, item) => sum + item.competency.score! * item.weight, 0) / evidencedWeight
      : null
    const coverage = totalWeight ? certification.competencies.reduce((sum, item) =>
      sum + competencyById.get(item.competencyId)!.coverage * item.weight, 0) / totalWeight : 0
    const confidence = totalWeight ? certification.competencies.reduce((sum, item) =>
      sum + competencyById.get(item.competencyId)!.confidence * item.weight, 0) / totalWeight : 0
    const threshold = certification.masteryThreshold ?? config.masteryThreshold
    const minCoverage = certification.minimumCoverage ?? config.readinessCoverage
    const minConfidence = certification.minimumConfidence ?? config.readinessConfidence
    const status = readinessStatus(
      score, coverage >= minCoverage ? coverage : 0, confidence >= minConfidence ? confidence : 0, threshold, config,
    )
    return {
      certificationId: certification.id,
      score: score === null ? null : round(score),
      coverage: round(coverage),
      confidence: round(confidence),
      status,
      blockingCompetencyIds: certification.competencies
        .filter(({ competencyId }) => {
          const competency = competencyById.get(competencyId)!
          return competency.score === null || competency.score < threshold || competency.coverage < minCoverage
        })
        .map(({ competencyId }) => competencyId),
    }
  })

  const careerPathReadiness = careerPaths.map((careerPath): CareerReadiness => {
    const totalWeight = careerPath.competencies.reduce((sum, item) => sum + item.weight, 0)
    const evidenced = careerPath.competencies
      .map((item) => ({ ...item, competency: competencyById.get(item.competencyId)! }))
      .filter(({ competency }) => competency.score !== null)
    const evidencedWeight = evidenced.reduce((sum, item) => sum + item.weight, 0)
    const score = evidencedWeight
      ? evidenced.reduce((sum, item) => sum + Math.min(100, item.competency.score! / item.target * 100) * item.weight, 0) / evidencedWeight
      : null
    const coverage = totalWeight ? careerPath.competencies.reduce((sum, item) =>
      sum + competencyById.get(item.competencyId)!.coverage * item.weight, 0) / totalWeight : 0
    const confidence = totalWeight ? careerPath.competencies.reduce((sum, item) =>
      sum + competencyById.get(item.competencyId)!.confidence * item.weight, 0) / totalWeight : 0
    const minCoverage = careerPath.minimumCoverage ?? config.readinessCoverage
    const minConfidence = careerPath.minimumConfidence ?? config.readinessConfidence
    const blockingCompetencyIds = careerPath.competencies
      .filter(({ competencyId, target }) => {
        const competency = competencyById.get(competencyId)!
        return competency.score === null || competency.score < target || competency.coverage < minCoverage
      })
      .map(({ competencyId }) => competencyId)
    return {
      careerPathId: careerPath.id,
      score: score === null ? null : round(score),
      coverage: round(coverage),
      confidence: round(confidence),
      status: readinessStatus(score, coverage >= minCoverage ? coverage : 0,
        confidence >= minConfidence ? confidence : 0, 100, config),
      blockingCompetencyIds,
    }
  })

  const weaknesses = skills.map((skill): Weakness => {
    const missing = skill.score === null
    const masteryGap = skill.score === null
      ? 1
      : clamp((config.masteryThreshold - skill.score) / config.masteryThreshold, 0, 1)
    const coverageGap = 1 - skill.coverage
    const decayRisk = skill.unweightedScore ? clamp(skill.decayLoss / skill.unweightedScore, 0, 1) : 0
    const reason = missing ? 'no-evidence' :
      decayRisk >= masteryGap && decayRisk >= coverageGap ? 'knowledge-decay' :
        coverageGap > masteryGap ? 'low-confidence' : 'low-mastery'
    return {
      skillId: skill.skillId,
      priority: round(clamp((masteryGap * 0.45 + coverageGap * 0.4 + decayRisk * 0.15) * 100, 0, 100)),
      reason,
    }
  }).filter(({ priority }) => priority > 0).sort((a, b) => b.priority - a.priority)

  return { skills, competencies, certifications: certificationReadiness, careerPaths: careerPathReadiness, weaknesses }
}

export function rankReviewCandidates(
  candidates: ReviewCandidate[],
  skills: SkillMastery[],
  weaknesses: Weakness[],
  now: number,
): ReviewPriority[] {
  if (!Number.isFinite(now)) throw new Error('The review time must be finite.')
  const skillById = new Map(skills.map((skill) => [skill.skillId, skill]))
  const weaknessById = new Map(weaknesses.map((weakness) => [weakness.skillId, weakness]))
  return candidates.map((candidate) => {
    if (!Number.isFinite(candidate.dueAt) || candidate.skillIds.length === 0 ||
      !Number.isFinite(candidate.intervalDays) || candidate.intervalDays <= 0) {
      throw new Error(`Invalid review candidate: ${candidate.id}`)
    }
    const rankedSkills = candidate.skillIds.map((skillId) => ({
      skillId,
      priority: (weaknessById.get(skillId)?.priority ?? 0) +
        (skillById.get(skillId)?.score === null ? 20 : 0),
    })).sort((a, b) => b.priority - a.priority)
    const weakestSkillId = rankedSkills[0]?.skillId ?? null
    const overdueDays = Math.max(0, (now - candidate.dueAt) / DAY)
    const weaknessPriority = rankedSkills[0]?.priority ?? 0
    const overdueWeight = Math.min(25, overdueDays / Math.max(1, candidate.intervalDays) * 25)
    return {
      id: candidate.id,
      priority: round(clamp(weaknessPriority * 0.7 + overdueWeight + (candidate.dueAt <= now ? 5 : 0), 0, 100)),
      overdueDays: round(overdueDays),
      weakestSkillId,
    }
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
}
