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

/** UTC day key — the bucketing every function here shares. */
function dayKey(ts: Date): string {
  return ts.toISOString().slice(0, 10)
}

/**
 * The longest run of consecutive UTC days with an attempt anywhere in the
 * supplied window — the student's personal best, for as far back as the caller
 * looked. No grace period: unlike `computeStreak` this describes history rather
 * than a live streak, and a gap that was survived at the time is still a gap.
 */
export function computeLongestStreak(timestamps: Date[]): number {
  if (timestamps.length === 0) return 0

  const days = [...new Set(timestamps.map(dayKey))].sort()

  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`)
    prev.setUTCDate(prev.getUTCDate() + 1)
    run = dayKey(prev) === days[i] ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

/** Attempts in the last `days` UTC days, today included. */
export function countRecentAttempts(timestamps: Date[], days: number): number {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1))
  const cutoffKey = dayKey(cutoff)
  return timestamps.filter((ts) => dayKey(ts) >= cutoffKey).length
}
