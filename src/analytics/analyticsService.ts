export const ANALYTICS_STORAGE_KEY = 'industrialiq-analytics-v1'
const SESSION_STORAGE_KEY = 'industrialiq-analytics-session-v1'
const MAX_LOCAL_EVENTS = 1_000
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

type AnalyticsValue = string | number | boolean | null
type AnalyticsPropertyValues = Record<string, AnalyticsValue>

export interface AnalyticsEventProperties {
  'Course Opened': {
    courseId: string
    courseName: string
    source: string
  } & AnalyticsPropertyValues
  'Flashcard Viewed': {
    courseId: string
    moduleId: string
    questionId: string
    reviewNumber: number
    lightning: boolean
  } & AnalyticsPropertyValues
  'Flashcard Correct': {
    courseId: string
    moduleId: string
    questionId: string
    reviewNumber: number
    rating: 'hard' | 'good' | 'easy'
  } & AnalyticsPropertyValues
  'Flashcard Incorrect': {
    courseId: string
    moduleId: string
    questionId: string
    reviewNumber: number
    rating: 'again'
  } & AnalyticsPropertyValues
  'Exam Started': {
    courseId: string
    examId: string
    moduleFilter: string
    questionCount: number
    timed: boolean
    durationSeconds: number | null
  } & AnalyticsPropertyValues
  'Exam Finished': {
    courseId: string
    examId: string
    moduleFilter: string
    questionCount: number
    answeredCount: number
    correctCount: number
    incorrectCount: number
    scorePercent: number
    durationSeconds: number
    expired: boolean
  } & AnalyticsPropertyValues
  'Question Answered': {
    courseId: string
    examId: string
    moduleId: string
    questionId: string
    mode: 'practice' | 'exam'
    correct: boolean
  } & AnalyticsPropertyValues
  'Question Missed': {
    courseId: string
    examId: string
    moduleId: string
    questionId: string
    mode: 'practice' | 'exam'
    unanswered: boolean
  } & AnalyticsPropertyValues
  'Module Opened': {
    courseId: string
    moduleId: string
    moduleName: string
    source: string
  } & AnalyticsPropertyValues
  'Mentor Viewed': {
    courseId: string
    view: string
  } & AnalyticsPropertyValues
  'Roadmap Viewed': {
    source: string
  } & AnalyticsPropertyValues
}

export type AnalyticsEventName = keyof AnalyticsEventProperties

export interface AnalyticsEvent {
  id: string
  name: AnalyticsEventName
  properties: AnalyticsPropertyValues
  anonymousId: string
  sessionId: string
  occurredAt: number
}

export interface AnalyticsProvider {
  capture(
    name: AnalyticsEventName,
    properties: AnalyticsPropertyValues,
    context: Omit<AnalyticsEvent, 'name' | 'properties'>,
  ): void | Promise<void>
}

interface AnalyticsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface AnalyticsServiceOptions {
  storage?: AnalyticsStorage | null
  now?: () => number
  createId?: () => string
}

interface StoredAnalytics {
  version: 1
  events: AnalyticsEvent[]
}

interface StoredSession {
  id: string
  expiresAt: number
}

const eventNames = new Set<AnalyticsEventName>([
  'Course Opened',
  'Flashcard Viewed',
  'Flashcard Correct',
  'Flashcard Incorrect',
  'Exam Started',
  'Exam Finished',
  'Question Answered',
  'Question Missed',
  'Module Opened',
  'Mentor Viewed',
  'Roadmap Viewed',
])

function browserStorage(): AnalyticsStorage | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function createAnalyticsId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (!isRecord(value) || !eventNames.has(value.name as AnalyticsEventName)) return false
  return typeof value.id === 'string' &&
    typeof value.anonymousId === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.occurredAt === 'number' &&
    Number.isFinite(value.occurredAt) &&
    isRecord(value.properties)
}

function reportStorageError(action: string, error: unknown) {
  console.warn(`[analytics] Could not ${action}; events remain available in memory for this session.`, error)
}

export class AnalyticsService {
  private readonly storage: AnalyticsStorage | null
  private readonly now: () => number
  private readonly createId: () => string
  private provider: AnalyticsProvider | null = null
  private events: AnalyticsEvent[] | null = null
  private session: StoredSession | null = null
  private canPersist = true

  constructor(options: AnalyticsServiceOptions = {}) {
    this.storage = options.storage === undefined ? browserStorage() : options.storage
    this.now = options.now ?? Date.now
    this.createId = options.createId ?? createAnalyticsId
  }

  setProvider(provider: AnalyticsProvider | null) {
    this.provider = provider
  }

  track<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEventProperties[Name]) {
    const events = this.localEvents()
    const sessionId = this.sessionId()
    const event: AnalyticsEvent = {
      id: this.createId(),
      name,
      properties: { ...properties },
      anonymousId: sessionId,
      sessionId,
      occurredAt: this.now(),
    }
    this.events = [...events, event].slice(-MAX_LOCAL_EVENTS)
    this.persistEvents()
    this.capture(event)
  }

  getEvents(): AnalyticsEvent[] {
    return this.localEvents().map((event) => ({ ...event, properties: { ...event.properties } }))
  }

  clear() {
    this.events = []
    this.persistEvents()
  }

  private localEvents() {
    if (this.events !== null) return this.events
    if (!this.storage) {
      this.events = []
      return this.events
    }
    try {
      const raw = this.storage.getItem(ANALYTICS_STORAGE_KEY)
      if (!raw) {
        this.events = []
        return this.events
      }
      const stored: unknown = JSON.parse(raw)
      if (!isRecord(stored) || stored.version !== 1 || !Array.isArray(stored.events) || !stored.events.every(isAnalyticsEvent)) {
        throw new Error('Unrecognized local analytics format.')
      }
      this.events = stored.events.slice(-MAX_LOCAL_EVENTS)
      return this.events
    } catch (error) {
      this.canPersist = false
      this.events = []
      reportStorageError('read local analytics storage', error)
      return this.events
    }
  }

  private persistEvents() {
    if (!this.storage || !this.canPersist) return
    const stored: StoredAnalytics = { version: 1, events: this.localEvents() }
    try {
      this.storage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(stored))
    } catch (error) {
      this.canPersist = false
      reportStorageError('persist analytics events', error)
    }
  }

  private sessionId() {
    const now = this.now()
    if (this.session && this.session.expiresAt > now) return this.session.id
    if (this.storage && this.canPersist) {
      try {
        const raw = this.storage.getItem(SESSION_STORAGE_KEY)
        const stored: unknown = raw ? JSON.parse(raw) : null
        if (isRecord(stored) && typeof stored.id === 'string' && typeof stored.expiresAt === 'number' && stored.expiresAt > now) {
          this.session = { id: stored.id, expiresAt: stored.expiresAt }
          return this.session.id
        }
        this.session = { id: this.createId(), expiresAt: now + SESSION_DURATION_MS }
        this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session))
        return this.session.id
      } catch (error) {
        this.canPersist = false
        reportStorageError('persist the anonymous analytics session', error)
      }
    }
    this.session = { id: this.createId(), expiresAt: now + SESSION_DURATION_MS }
    return this.session.id
  }

  private capture(event: AnalyticsEvent) {
    if (!this.provider) return
    const context = {
      id: event.id,
      anonymousId: event.anonymousId,
      sessionId: event.sessionId,
      occurredAt: event.occurredAt,
    }
    try {
      void Promise.resolve(this.provider.capture(event.name, event.properties, context)).catch((error) => {
        console.warn(`[analytics] The configured provider rejected "${event.name}".`, error)
      })
    } catch (error) {
      console.warn(`[analytics] The configured provider could not capture "${event.name}".`, error)
    }
  }
}

interface PostHogLike {
  capture(event: string, properties?: Record<string, unknown>): void
}

export function createPostHogProvider(posthog: PostHogLike): AnalyticsProvider {
  return {
    capture(name, properties, context) {
      posthog.capture(name, {
        ...properties,
        $insert_id: context.id,
        $session_id: context.sessionId,
        distinct_id: context.anonymousId,
        occurred_at: new Date(context.occurredAt).toISOString(),
      })
    },
  }
}

export const analyticsService = new AnalyticsService()
