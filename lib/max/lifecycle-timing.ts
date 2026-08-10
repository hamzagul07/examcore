/** Pure timing helpers for Max post-purchase drip (tour + day-4). */

export const MAX_TOUR_DELAY_MS = 24 * 60 * 60 * 1000
export const MAX_DAY4_DELAY_MS = 4 * 86_400_000
/** Skip welcome claims older than this — late drips read as broken. */
export const MAX_LIFECYCLE_BACKLOG_MS = 21 * 86_400_000

export function isEligibleForMaxTour(params: {
  welcomeAt: Date
  now: Date
  alreadySent: boolean
}): boolean {
  if (params.alreadySent) return false
  const age = params.now.getTime() - params.welcomeAt.getTime()
  if (age < MAX_TOUR_DELAY_MS) return false
  if (age > MAX_LIFECYCLE_BACKLOG_MS) return false
  return true
}

export function isEligibleForMaxDay4(params: {
  welcomeAt: Date
  now: Date
  alreadySent: boolean
}): boolean {
  if (params.alreadySent) return false
  const age = params.now.getTime() - params.welcomeAt.getTime()
  if (age < MAX_DAY4_DELAY_MS) return false
  if (age > MAX_LIFECYCLE_BACKLOG_MS) return false
  return true
}
