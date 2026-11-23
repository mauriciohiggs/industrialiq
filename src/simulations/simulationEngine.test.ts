import { describe, expect, it } from 'vitest'
import { createSimulationEngine } from './simulationEngine'
import type { SimulationScenario } from './simulationModels'

const scenario: SimulationScenario = {
  id: 'opc-outage',
  schemaVersion: 1,
  title: 'Plant loses OPC connection',
  competencies: [{ id: 'diagnostics', name: 'System diagnostics' }],
  startNodeId: 'triage',
  nodes: [
    {
      id: 'triage',
      title: 'Connection loss',
      content: 'The PLC values are stale. What do you check first?',
      kind: 'decision',
      choices: [
        {
          id: 'physical-network',
          label: 'Check the physical network path and gateway status',
          points: 10,
          competencyImpacts: [{ competencyId: 'diagnostics', delta: 15 }],
          nextNodeId: 'outcome',
          branches: [{
            nextNodeId: 'network-troubleshooting',
            when: { field: 'competency', competencyId: 'diagnostics', operator: 'lt', value: 20 },
          }],
        },
        {
          id: 'restart-server',
          label: 'Restart the server immediately',
          points: -5,
          competencyImpacts: [{ competencyId: 'diagnostics', delta: -10 }],
          nextNodeId: 'outcome',
        },
      ],
    },
    {
      id: 'network-troubleshooting',
      title: 'Continue diagnosis',
      content: 'The gateway is reachable. Where do you inspect the OPC endpoint?',
      kind: 'decision',
      choices: [{
        id: 'gateway-status',
        label: 'Inspect gateway connection diagnostics',
        points: 5,
        nextNodeId: 'outcome',
      }],
    },
    {
      id: 'outcome',
      title: 'Triage complete',
      content: 'You established the next diagnostic step.',
      kind: 'outcome',
    },
  ],
}

describe('simulation engine', () => {
  it('applies points and competency updates, then resolves a conditional branch', () => {
    let now = 100
    const engine = createSimulationEngine(scenario, { clock: () => now })
    const initial = engine.start({ attemptId: 'attempt-1', competencyScores: { diagnostics: 0 } })

    const result = engine.decide(initial, 'physical-network')

    expect(result.session.currentNodeId).toBe('network-troubleshooting')
    expect(result.session.score).toBe(10)
    expect(result.session.competencyScores.diagnostics).toBe(15)
    expect(result.session.decisions).toHaveLength(1)
    expect(initial.decisions).toHaveLength(0)

    now = 110
    const complete = engine.decide(result.session, 'gateway-status')
    expect(complete.completed).toBe(true)
    expect(engine.summarize(complete.session)).toMatchObject({
      score: 15,
      decisionCount: 2,
      competencyScores: { diagnostics: 15 },
      completedAt: 110,
    })
  })

  it('falls back to the default transition and keeps competencies in range', () => {
    const engine = createSimulationEngine(scenario, {
      clock: () => 100,
      minimumScore: 0,
    })
    const initial = engine.start({ attemptId: 'attempt-2', competencyScores: { diagnostics: 5 } })
    const result = engine.decide(initial, 'restart-server')

    expect(result.session.currentNodeId).toBe('outcome')
    expect(result.session.score).toBe(0)
    expect(result.session.competencyScores.diagnostics).toBe(0)
    expect(result.completed).toBe(true)
  })

  it('rejects invalid choices without mutating session state', () => {
    const engine = createSimulationEngine(scenario, { clock: () => 100 })
    const initial = engine.start({ attemptId: 'attempt-3' })

    expect(() => engine.decide(initial, 'missing')).toThrow(/Unknown choice/)
    expect(initial.score).toBe(0)
  })
})
