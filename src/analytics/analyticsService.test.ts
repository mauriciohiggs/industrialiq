import { describe, expect, it, vi } from 'vitest'
import { ANALYTICS_STORAGE_KEY, AnalyticsService, createPostHogProvider } from './analyticsService'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  }
}

describe('analytics service', () => {
  it('stores typed events locally and forwards the same data to a provider', async () => {
    const storage = memoryStorage()
    let eventId = 0
    const service = new AnalyticsService({ storage, now: () => 1_000, createId: () => `id-${++eventId}` })
    const capture = vi.fn()
    service.setProvider({ capture })

    service.track('Exam Started', {
      courseId: 'ignition-core',
      examId: 'id-2',
      moduleFilter: 'All topics',
      questionCount: 50,
      timed: true,
      durationSeconds: 5_400,
    })

    expect(service.getEvents()).toEqual([expect.objectContaining({
      name: 'Exam Started',
      occurredAt: 1_000,
      properties: expect.objectContaining({ questionCount: 50 }),
    })])
    expect(capture).toHaveBeenCalledWith('Exam Started', expect.objectContaining({ questionCount: 50 }), expect.objectContaining({ occurredAt: 1_000 }))
    expect(JSON.parse(storage.getItem(ANALYTICS_STORAGE_KEY)!).version).toBe(1)
  })

  it('keeps analytics usable when local storage is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const service = new AnalyticsService({
      storage: { getItem: () => '{', setItem: vi.fn() },
      createId: () => 'id',
    })

    service.track('Roadmap Viewed', { source: 'footer' })

    expect(service.getEvents()).toHaveLength(1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('maps events to a PostHog-compatible capture call', () => {
    const capture = vi.fn()
    const provider = createPostHogProvider({ capture })

    provider.capture('Roadmap Viewed', { source: 'footer' }, {
      id: 'event-id',
      anonymousId: 'anonymous-id',
      sessionId: 'session-id',
      occurredAt: 1_000,
    })

    expect(capture).toHaveBeenCalledWith('Roadmap Viewed', {
      source: 'footer',
      $insert_id: 'event-id',
      $session_id: 'session-id',
      distinct_id: 'anonymous-id',
      occurred_at: '1970-01-01T00:00:01.000Z',
    })
  })
})
