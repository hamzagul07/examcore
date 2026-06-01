import { NextResponse } from 'next/server'

/** Seconds until UTC midnight — used for daily rate-limit Retry-After. */
export function secondsUntilUtcMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.max(60, Math.ceil((midnight.getTime() - now.getTime()) / 1000))
}

export function rateLimitJson(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { 'Retry-After': String(secondsUntilUtcMidnight()) },
    }
  )
}

/** Hourly sliding-window limits (e.g. Omni IP throttle). */
export function hourlyRateLimitHeaders(windowSeconds = 3600): HeadersInit {
  return { 'Retry-After': String(windowSeconds) }
}
