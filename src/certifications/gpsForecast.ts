import type { CertificationForecast, GpsForecastOptions } from './gpsModels'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function forecastCertification(
  readiness: number | null,
  coverage: number,
  distanceRemainingHours: number,
  options: GpsForecastOptions = {},
): CertificationForecast {
  const days = clamp(options.days ?? 7, 1, 365)
  const dailyStudyMinutes = clamp(options.dailyStudyMinutes ?? 45, 0, 480)
  const masteryTarget = clamp(options.masteryTarget ?? 80, 1, 100)
  const current = clamp(readiness ?? 0, 0, 100)
  const studyHours = dailyStudyMinutes * days / 60
  const distance = Math.max(0.5, distanceRemainingHours)
  const planCompletion = clamp(studyHours / (distance * 0.8), 0, 1)
  const confidence: CertificationForecast['confidence'] = coverage >= 0.6 ? 'strong' :
    coverage >= 0.25 ? 'moderate' : 'building'
  const evidenceFactor = confidence === 'strong' ? 1 : confidence === 'moderate' ? 0.9 : 0.75
  const projectedGain = Math.max(0, masteryTarget - current) * planCompletion * evidenceFactor

  return {
    days,
    projectedReadiness: readiness === null ? 0 : Math.round(clamp(current + projectedGain, 0, masteryTarget)),
    dailyStudyMinutes,
    confidence,
  }
}
