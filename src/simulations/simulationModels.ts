export type SimulationStatus = 'active' | 'completed'
export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'

export interface SimulationCompetency {
  id: string
  name: string
  description?: string
}

export type BranchCondition =
  | { all: BranchCondition[] }
  | { any: BranchCondition[] }
  | { not: BranchCondition }
  | { field: 'score'; operator: ComparisonOperator; value: number }
  | {
      field: 'competency'
      competencyId: string
      operator: ComparisonOperator
      value: number
    }
  | { field: 'flag'; flag: string; value: boolean }
  | { field: 'decision'; choiceId: string; occurred: boolean }

export interface ScenarioBranch {
  nextNodeId: string
  when: BranchCondition
}

export interface CompetencyImpact {
  competencyId: string
  delta: number
  reason?: string
}

export interface ScenarioChoice {
  id: string
  label: string
  description?: string
  points: number
  competencyImpacts?: CompetencyImpact[]
  nextNodeId: string
  branches?: ScenarioBranch[]
  flags?: Record<string, boolean>
  feedback?: string
}

export interface ScenarioNode {
  id: string
  title: string
  content: string
  kind: 'decision' | 'outcome'
  choices?: ScenarioChoice[]
  competencyIds?: string[]
}

export interface SimulationScenario {
  id: string
  schemaVersion: number
  title: string
  description?: string
  competencies: SimulationCompetency[]
  startNodeId: string
  nodes: ScenarioNode[]
  metadata?: Record<string, string | number | boolean | null>
}

export interface CompetencyUpdate {
  competencyId: string
  previousScore: number
  score: number
  delta: number
  reason?: string
}

export interface DecisionRecord {
  id: string
  nodeId: string
  choiceId: string
  choiceLabel: string
  at: number
  pointsAwarded: number
  competencyUpdates: CompetencyUpdate[]
  nextNodeId: string
}

export interface SimulationSession {
  scenarioId: string
  schemaVersion: number
  attemptId: string
  status: SimulationStatus
  currentNodeId: string
  score: number
  competencyScores: Record<string, number>
  flags: Record<string, boolean>
  decisions: DecisionRecord[]
  startedAt: number
  completedAt: number | null
}

export interface DecisionResult {
  session: SimulationSession
  decision: DecisionRecord
  completed: boolean
  feedback?: string
}

export interface SimulationSummary {
  scenarioId: string
  attemptId: string
  score: number
  decisionCount: number
  competencyScores: Record<string, number>
  completedAt: number
}

export interface ScenarioContext {
  scenario: SimulationScenario
  session: SimulationSession
  node: ScenarioNode
  choice: ScenarioChoice
}

export interface ScoringResult {
  points: number
  competencyImpacts: CompetencyImpact[]
}

export interface SimulationScoringPolicy {
  score(context: ScenarioContext): ScoringResult
}

export interface StartSimulationOptions {
  attemptId: string
  competencyScores?: Record<string, number>
  flags?: Record<string, boolean>
}
