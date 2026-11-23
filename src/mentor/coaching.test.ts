import { describe, expect, it, vi } from 'vitest'
import {
  MentorCoachingService,
  type CoachingProvider,
  type MentorCoachingInput,
} from './coaching'

const input: MentorCoachingInput = {
  readiness: 68,
  competencies: [
    { name: 'Operator interface', score: 84 },
    { name: 'Industrial security', score: 42 },
  ],
  careerReadiness: [{ name: 'SCADA Engineer', score: 68 }],
  weakAreas: [{ name: 'Security', score: 8 }],
  targetLearningPath: 'Ignition Core',
  availableResources: [
    {
      id: 'security-flashcards',
      name: 'Security flashcards',
      type: 'flashcards',
      quantity: 12,
      taskId: 'spaced-review',
      estimatedReadinessGainPercent: 3,
    },
    {
      id: 'gateway-quiz',
      name: 'Gateway quiz',
      type: 'practice',
      quantity: 1,
      taskId: 'confidence',
      estimatedReadinessGainPercent: 1,
    },
  ],
}

describe('mentor coaching', () => {
  it('creates deterministic local coaching from dashboard evidence', () => {
    const result = new MentorCoachingService().template(input)

    expect(result.mode).toBe('template')
    expect(result.strongestArea?.name).toBe('Operator interface')
    expect(result.largestGap?.name).toBe('Security')
    expect(result.actions[0].resourceName).toBe('Security flashcards')
    expect(result.message).toContain('68% prepared for the Ignition Core learning path')
  })

  it('hydrates provider-selected actions only from supplied resources', async () => {
    const provider: CoachingProvider = {
      selectCoaching: vi.fn().mockResolvedValue({
        strongestArea: { name: 'Operator interface', score: 84 },
        largestGap: { name: 'Security', score: 8 },
        readinessPercent: 68,
        targetLearningPath: 'Ignition Core',
        actions: [
          { resourceId: 'security-flashcards', quantity: 12 },
          { resourceId: 'gateway-quiz', quantity: 1 },
        ],
      }),
    }

    const result = await new MentorCoachingService(provider).coach(input)

    expect(result.mode).toBe('provider')
    expect(result.actions.map((action) => action.resourceId)).toEqual([
      'security-flashcards',
      'gateway-quiz',
    ])
    expect(result.guardrails.usedOnlyProvidedResources).toBe(true)
  })

  it('falls back when a provider invents a learning resource', async () => {
    const provider: CoachingProvider = {
      selectCoaching: vi.fn().mockResolvedValue({
        strongestArea: { name: 'Operator interface', score: 84 },
        largestGap: { name: 'Security', score: 8 },
        readinessPercent: 68,
        targetLearningPath: 'Ignition Core',
        actions: [{ resourceId: 'invented-course', quantity: 1 }],
      }),
    }

    const result = await new MentorCoachingService(provider).coach(input)

    expect(result.mode).toBe('template')
    expect(result.actions.every((action) =>
      input.availableResources.some((resource) => resource.id === action.resourceId))).toBe(true)
  })
})
