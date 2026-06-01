/**
 * Streak = consecutive UTC days (going back from today) with at least one
 * attempt. Honors a one-day grace period.
 */
export function computeStreak(timestamps: Date[]): number {
  if (timestamps.length === 0) return 0

  const days = new Set<string>()
  for (const ts of timestamps) {
    days.add(ts.toISOString().slice(0, 10))
  }

  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  let cursor: Date
  if (days.has(todayKey)) {
    cursor = new Date(`${todayKey}T00:00:00Z`)
  } else if (days.has(yesterdayKey)) {
    cursor = new Date(`${yesterdayKey}T00:00:00Z`)
  } else {
    return 0
  }

  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
