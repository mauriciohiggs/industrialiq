import type {
  CompetencyAssessment,
  DiagnosticAnswer,
  DiagnosticConfiguration,
  DiagnosticGraph,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticSession,
  LearningPathStep,
  SkillAssessment,
  SkillGap,
} from './diagnosticModels'
import { DEFAULT_DIAGNOSTIC_CONFIGURATION } from './diagnosticEngine'
import { validateDiagnosticGraph } from './diagnosticEngine'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const round = (value: number) => Math.round(value * 10) / 10

function evidenceForSkill(answers: DiagnosticAnswer[], skillId: string) {
  return answers.filter((answer) => answer.skillIds.includes(skillId))
}

function assessSkill(
  graph: DiagnosticGraph,
  answers: DiagnosticAnswer[],
  skillId: string,
  targetScore: number,
): SkillAssessment {
  const skill = graph.skills.find(({ id }) => id === skillId)
  if (!skill) throw new Error(`Unknown skill in diagnostic report: ${skillId}`)
  const evidence = evidenceForSkill(answers, skillId)
  const correct = evidence.filter((answer) => answer.correct).length
  const score = evidence.length ? round(correct / evidence.length * 100) : null
  const confidence = round(clamp(evidence.length / 2, 0, 1))
  const gap = score === null ? 100 : round(Math.max(0, targetScore - score))
  const status = score === null ? 'not-assessed'
    : confidence < 0.5 ? 'developing'
      : score >= targetScore ? 'strength'
        : score >= targetScore - 20 ? 'developing' : 'weakness'
  return {
    skillId,
    name: skill.name,
    score,
    targetScore,
    confidence,
    evidenceCount: evidence.length,
    gap,
    priority: round(gap * (1.25 - confidence * 0.25)),
    status,
  }
}

function readinessSummary(score: number | null, coverage: number, confidence: number) {
  if (score === null || coverage < 0.2 || confidence < 0.25) {
    return { level: 'insufficient-evidence' as const, summary: 'More assessed evidence is needed before assigning a readiness baseline.' }
  }
  if (score >= 85 && coverage >= 0.9 && confidence >= 0.5) {
    return { level: 'ready' as const, summary: 'The baseline indicates strong readiness across the assessed competencies.' }
  }
  if (score >= 75 && coverage >= 0.75) {
    return { level: 'nearly-ready' as const, summary: 'The baseline is close to target; focus on the highest-priority gaps.' }
  }
  if (score >= 60) {
    return { level: 'developing' as const, summary: 'Core knowledge is developing; a focused learning sequence is recommended.' }
  }
  return { level: 'foundation' as const, summary: 'Build foundational knowledge before moving to advanced industrial scenarios.' }
}

function learningPath(
  gaps: SkillGap[],
  questions: DiagnosticQuestion[],
): LearningPathStep[] {
  return gaps
    .filter(({ priority }) => priority > 0)
    .sort((a, b) => b.priority - a.priority || a.skillId.localeCompare(b.skillId))
    .slice(0, 5)
    .map((gap, index) => ({
      step: index + 1,
      skillId: gap.skillId,
      competencyIds: gap.competencyIds,
      title: gap.currentScore === null
        ? `Establish a baseline for ${gap.name}`
        : `Close the ${gap.name} skill gap`,
      reason: gap.reason === 'not-assessed'
        ? 'This skill was not measured during the initial assessment.'
        : gap.reason === 'low-confidence'
          ? 'Limited evidence makes this skill a priority for targeted practice.'
          : `Current performance is ${round(gap.gap)} points below the ${gap.targetScore} target.`,
      priority: gap.priority,
      estimatedMinutes: Math.min(60, 15 + Math.ceil(gap.gap / 10) * 5),
      recommendedQuestionIds: questions
        .filter((question) => question.skillIds.includes(gap.skillId))
        .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id))
        .slice(0, 3)
        .map(({ id }) => id),
    }))
}

export function generateDiagnosticReport(
  session: DiagnosticSession,
  questions: DiagnosticQuestion[],
  graph: DiagnosticGraph,
  generatedAt: number = Date.now(),
  configuration: Partial<DiagnosticConfiguration> = {},
): DiagnosticReport {
  validateDiagnosticGraph(graph)
  if (!session.answers.length || !Number.isFinite(generatedAt) || generatedAt < session.startedAt) {
    throw new Error('A diagnostic report requires completed answers and a valid generation time.')
  }
  const config = { ...DEFAULT_DIAGNOSTIC_CONFIGURATION, ...configuration }
  const skillAssessments = graph.skills.map((skill) =>
    assessSkill(graph, session.answers, skill.id, skill.targetScore ?? config.targetScore))
  const skillById = new Map(skillAssessments.map((skill) => [skill.skillId, skill]))
  const competencyAnalysis: CompetencyAssessment[] = graph.competencies.map((competency) => {
    const assessments = competency.skillIds.map((skillId) => skillById.get(skillId)!)
    const evidenced = assessments.filter(({ score }) => score !== null)
    const score = evidenced.length
      ? round(evidenced.reduce((sum, skill) => sum + skill.score! * (graph.skills.find(({ id }) => id === skill.skillId)?.weight ?? 1), 0) /
        evidenced.reduce((sum, skill) => sum + (graph.skills.find(({ id }) => id === skill.skillId)?.weight ?? 1), 0))
      : null
    const coverage = assessments.filter(({ evidenceCount }) => evidenceCount > 0).length / assessments.length
    const confidence = round(assessments.reduce((sum, skill) => sum + skill.confidence, 0) / assessments.length)
    const target = competency.targetScore ?? config.targetScore
    const evidenceCount = assessments.reduce((sum, skill) => sum + skill.evidenceCount, 0)
    const status = score === null ? 'not-assessed'
      : confidence < 0.5 ? 'developing'
        : score >= target ? 'strength'
          : score >= target - 20 ? 'developing' : 'weakness'
    return {
      competencyId: competency.id,
      name: competency.name,
      score,
      confidence,
      coverage: round(coverage),
      evidenceCount,
      status,
      skillAssessments: assessments,
    }
  })

  const assessedSkills = skillAssessments.filter(({ score }) => score !== null)
  const weighted = assessedSkills.reduce((sum, skill) =>
    sum + skill.score! * (graph.skills.find(({ id }) => id === skill.skillId)?.weight ?? 1), 0)
  const totalWeight = assessedSkills.reduce((sum, skill) =>
    sum + (graph.skills.find(({ id }) => id === skill.skillId)?.weight ?? 1), 0)
  const score = totalWeight ? round(weighted / totalWeight) : null
  const coverage = graph.skills.length ? assessedSkills.length / graph.skills.length : 0
  const confidence = graph.skills.length
    ? round(skillAssessments.reduce((sum, skill) => sum + skill.confidence, 0) / graph.skills.length)
    : 0
  const readiness = readinessSummary(score, coverage, confidence)
  const topStrengths = [...assessedSkills]
    .sort((a, b) => b.score! - a.score! || b.confidence - a.confidence || a.skillId.localeCompare(b.skillId))
    .slice(0, 3)
  const gaps: SkillGap[] = skillAssessments.map((skill) => ({
    skillId: skill.skillId,
    name: skill.name,
    competencyIds: graph.skills.find(({ id }) => id === skill.skillId)!.competencyIds,
    currentScore: skill.score,
    targetScore: skill.targetScore,
    gap: skill.gap,
    confidence: skill.confidence,
    reason: skill.score === null ? 'not-assessed' : skill.confidence < 0.5 ? 'low-confidence' : 'below-target',
    priority: skill.priority,
  }))
  const topWeaknesses = [...skillAssessments]
    .sort((a, b) => b.priority - a.priority || a.skillId.localeCompare(b.skillId))
    .slice(0, 3)
  const completedAt = session.completedAt ?? generatedAt
  return {
    version: 1,
    sessionId: session.id,
    userId: session.userId,
    generatedAt,
    durationSeconds: Math.max(0, round((completedAt - session.startedAt) / 1000)),
    algorithmVersion: 'adaptive-diagnostic-v1',
    currentReadiness: {
      score,
      level: readiness.level,
      confidence,
      coverage: round(coverage),
      assessedSkills: assessedSkills.length,
      totalSkills: graph.skills.length,
      assessedQuestions: session.answers.length,
      summary: readiness.summary,
    },
    competencyAnalysis,
    topStrengths,
    topWeaknesses,
    skillGaps: gaps.sort((a, b) => b.priority - a.priority || a.skillId.localeCompare(b.skillId)),
    learningPath: learningPath(gaps, questions),
  }
}

export function buildDiagnosticReport(
  session: DiagnosticSession,
  questions: DiagnosticQuestion[],
  graph: DiagnosticGraph,
  generatedAt?: number,
  configuration?: Partial<DiagnosticConfiguration>,
) {
  return generateDiagnosticReport(session, questions, graph, generatedAt, configuration)
}
