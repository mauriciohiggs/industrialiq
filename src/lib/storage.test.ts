import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyProgress, scheduleCard } from './study'
import { loadProgress, parseProgress, STORAGE_KEY } from './storage'

afterEach(() => vi.unstubAllGlobals())

describe('progress persistence and imports', () => {
  it('round-trips reviews, answers, and activity without data loss', () => {
    const progress = emptyProgress()
    progress.cards['security-01'] = scheduleCard(undefined, 'hard', 1000)
    progress.answers = [{ questionId: 'security-01', correct: false, at: 1000 }]
    progress.activity = ['2026-11-23']
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress)
  })

  it.each([
    '{',
    '{"version":2,"cards":{},"answers":[],"activity":[]}',
    '{"version":1,"cards":[],"answers":[],"activity":[]}',
    JSON.stringify({ ...emptyProgress(), answers: [{ questionId: 'a', correct: 'yes', at: 0 }] }),
    JSON.stringify({ ...emptyProgress(), cards: { a: { due: 0, interval: -1, reviews: 1, rating: 'good' } } }),
    JSON.stringify({ ...emptyProgress(), activity: ['2026-02-31'] }),
    JSON.stringify({ ...emptyProgress(), activity: ['not a date'] }),
  ])('rejects invalid import data: %s', (raw) => {
    expect(() => parseProgress(raw)).toThrow()
  })

  it('starts fresh only when no saved data exists', () => {
    const getItem = vi.fn().mockReturnValue(null)
    vi.stubGlobal('localStorage', { getItem })
    expect(loadProgress()).toEqual({ progress: emptyProgress(), error: null })
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  it('reports corrupt storage without overwriting the original data', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => 'broken', setItem })
    expect(loadProgress().error).toContain('has not been overwritten')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('reports browsers that deny local storage instead of silently claiming persistence', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Storage disabled') } })
    expect(loadProgress().error).toContain('Storage disabled')
  })
})
