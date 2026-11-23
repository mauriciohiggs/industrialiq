import type { Category } from '../types'
import type { IntelligenceCareerPath, IntelligenceCertification, IntelligenceCompetency, IntelligenceSkill } from './competencyEngine'

export const categorySkillIds: Record<Category, string> = {
  Gateway: 'gateway',
  Vision: 'vision',
  Perspective: 'perspective',
  Tags: 'tags',
  Security: 'security',
  Reporting: 'reporting',
  Historian: 'historian',
  'Transaction Groups': 'transaction-groups',
  Alarming: 'alarming',
}

export const skillCategories: Record<string, Category> = Object.fromEntries(
  Object.entries(categorySkillIds).map(([category, skillId]) => [skillId, category as Category]),
)

export const skills: IntelligenceSkill[] = Object.values(categorySkillIds).map((id) => ({
  id,
  decayHalfLifeDays: 120,
}))

export const competencies: IntelligenceCompetency[] = [
  {
    id: 'automation-platform',
    skills: [{ skillId: 'gateway', weight: 1 }, { skillId: 'tags', weight: 2 }],
    minimumTarget: 70,
  },
  {
    id: 'operator-interface',
    skills: [{ skillId: 'vision', weight: 1 }, { skillId: 'perspective', weight: 2 }],
    minimumTarget: 70,
  },
  {
    id: 'data-integration',
    skills: [
      { skillId: 'reporting', weight: 1 },
      { skillId: 'historian', weight: 1.5 },
      { skillId: 'transaction-groups', weight: 1.5 },
    ],
    minimumTarget: 70,
  },
  {
    id: 'operations-reliability',
    skills: [{ skillId: 'alarming', weight: 1 }, { skillId: 'historian', weight: 1 }],
    minimumTarget: 70,
  },
  {
    id: 'industrial-security',
    skills: [{ skillId: 'security', weight: 1 }],
    minimumTarget: 75,
  },
]

export const competencyNames: Record<string, string> = {
  'automation-platform': 'Automation platform',
  'operator-interface': 'Operator interface',
  'data-integration': 'Data integration',
  'operations-reliability': 'Operations reliability',
  'industrial-security': 'Industrial security',
}

export const certifications: IntelligenceCertification[] = [{
  id: 'ignition-core-practice',
  competencies: competencies.map(({ id }) => ({ competencyId: id, weight: 1 })),
  minimumCoverage: 0.25,
  minimumConfidence: 0.1,
}]

export const careerPaths: IntelligenceCareerPath[] = [
  {
    id: 'scada-engineer',
    competencies: [
      { competencyId: 'automation-platform', target: 80, weight: 2 },
      { competencyId: 'operator-interface', target: 80, weight: 2 },
      { competencyId: 'data-integration', target: 75, weight: 1.5 },
      { competencyId: 'operations-reliability', target: 80, weight: 1 },
      { competencyId: 'industrial-security', target: 65, weight: 0.5 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
  {
    id: 'controls-engineer',
    competencies: [
      { competencyId: 'automation-platform', target: 85, weight: 2.5 },
      { competencyId: 'operator-interface', target: 65, weight: 0.75 },
      { competencyId: 'data-integration', target: 70, weight: 1 },
      { competencyId: 'operations-reliability', target: 80, weight: 1.5 },
      { competencyId: 'industrial-security', target: 60, weight: 0.5 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
  {
    id: 'automation-engineer',
    competencies: [
      { competencyId: 'automation-platform', target: 80, weight: 1.5 },
      { competencyId: 'operator-interface', target: 75, weight: 1.25 },
      { competencyId: 'data-integration', target: 80, weight: 2 },
      { competencyId: 'operations-reliability', target: 75, weight: 1.25 },
      { competencyId: 'industrial-security', target: 70, weight: 1 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
  {
    id: 'ot-security-analyst',
    competencies: [
      { competencyId: 'automation-platform', target: 70, weight: 1 },
      { competencyId: 'operator-interface', target: 55, weight: 0.5 },
      { competencyId: 'data-integration', target: 70, weight: 1 },
      { competencyId: 'operations-reliability', target: 70, weight: 1 },
      { competencyId: 'industrial-security', target: 90, weight: 4 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
  {
    id: 'industrial-cybersecurity-engineer',
    competencies: [
      { competencyId: 'automation-platform', target: 75, weight: 1.25 },
      { competencyId: 'operator-interface', target: 65, weight: 0.75 },
      { competencyId: 'data-integration', target: 75, weight: 1.25 },
      { competencyId: 'operations-reliability', target: 70, weight: 1 },
      { competencyId: 'industrial-security', target: 90, weight: 4 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
  {
    id: 'reliability-engineer',
    competencies: [
      { competencyId: 'automation-platform', target: 75, weight: 1.5 },
      { competencyId: 'operator-interface', target: 65, weight: 0.75 },
      { competencyId: 'data-integration', target: 85, weight: 2.25 },
      { competencyId: 'operations-reliability', target: 90, weight: 3 },
      { competencyId: 'industrial-security', target: 65, weight: 0.75 },
    ],
    minimumCoverage: 0.2,
    minimumConfidence: 0.08,
  },
]

export const careerNames: Record<string, string> = {
  'scada-engineer': 'SCADA Engineer',
  'controls-engineer': 'Controls Engineer',
  'automation-engineer': 'Automation Engineer',
  'ot-security-analyst': 'OT Security Analyst',
  'industrial-cybersecurity-engineer': 'Industrial Cybersecurity Engineer',
  'reliability-engineer': 'Reliability Engineer',
}

export const industrialGraph = { skills, competencies, certifications, careerPaths }
