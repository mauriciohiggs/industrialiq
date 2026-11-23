import type { StudyFilter } from '../types'

export type GpsActionKind = 'flashcards' | 'practice' | 'module' | 'exam'

export interface CertificationGpsSkill {
  id: string
  name: string
  score: number | null
  coverage: number
  priority: number
}

export interface CertificationGpsAssessment {
  certificationId: string
  certificationName: string
  readiness: number | null
  coverage: number
  targetReadiness: number
  skills: CertificationGpsSkill[]
}

export interface GpsRoadblock {
  skillId: string
  name: string
  score: number | null
  priority: number
}

export interface GpsRouteStep {
  id: string
  title: string
  description: string
  kind: GpsActionKind
  filter: StudyFilter
  durationMinutes: number
  expectedGainPercent: number
}

export interface CertificationForecast {
  days: number
  projectedReadiness: number
  dailyStudyMinutes: number
  confidence: 'building' | 'moderate' | 'strong'
}

export interface CertificationGps {
  currentLocation: number | null
  destination: string
  distanceRemainingHours: number
  roadblocks: GpsRoadblock[]
  fastestRoute: GpsRouteStep[]
  alternativeRoute: GpsRouteStep[]
  forecast: CertificationForecast
}

export interface GpsPlannerOptions {
  maximumRoadblocks?: number
}

export interface GpsForecastOptions {
  days?: number
  dailyStudyMinutes?: number
  masteryTarget?: number
}
