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

/**
 * The limiter itself could not be consulted (RateLimitUnavailableError).
 *
 * bumpRateLimit throws on a rate_limits DB error rather than waving the
 * request through, and the contact, signup, lead and seat-request routes
 * had no catch for it — the submission died as an unhandled 500 where the
 * old read→upsert would have let it through. A 503 with a short retry is
 * the honest answer: nothing was recorded, and the same database that
 * refused the counter is unlikely to take the insert either.
 */
export function rateLimitUnavailableJson(
  message = 'That did not go through just now. Please try again in a moment.'
): NextResponse {
  return NextResponse.json(
    { error: message, retryable: true, code: 'rate_limit_unavailable' },
    { status: 503, headers: { 'Retry-After': '30' } }
  )
}

/** Hourly sliding-window limits (e.g. Omni IP throttle). */
export function hourlyRateLimitHeaders(windowSeconds = 3600): HeadersInit {
  return { 'Retry-After': String(windowSeconds) }
}
