import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Per-request wall-clock budget for model calls.
 *
 * The marking route is capped by Vercel's `maxDuration`. Nothing in the Gemini
 * retry loop knew about that cap, so a sticky 503 could burn 10 retries × a
 * 120s timeout each and get the function killed mid-stream — the client then
 * saw the stream simply end, with no `error` event and no telemetry.
 *
 * A deadline set at the top of the request lets both layers behave:
 *   - `withApiRetry` stops retrying when there is no time left to succeed in
 *   - per-call HTTP timeouts get clamped to the time actually remaining
 *
 * so the request fails *inside* its own handler, where it can release the
 * reservation, settle the telemetry row, and send a real error to the client.
 *
 * AsyncLocalStorage rather than a module global: several marks can be in flight
 * in one process and each needs its own deadline.
 */

type DeadlineContext = { deadlineAt: number }

const deadlineStore = new AsyncLocalStorage<DeadlineContext>()

/** Run `fn` with a wall-clock budget of `budgetMs` from now. */
export function withRequestDeadline<T>(
  budgetMs: number,
  fn: () => Promise<T>
): Promise<T> {
  return deadlineStore.run({ deadlineAt: Date.now() + budgetMs }, fn)
}

/** Milliseconds left in the current request budget, or null when unbounded. */
export function remainingRequestMs(): number | null {
  const ctx = deadlineStore.getStore()
  if (!ctx) return null
  return ctx.deadlineAt - Date.now()
}

/** Thrown when the request budget is spent — distinct from a per-call timeout
 * so the classifier can tell "this one call hung" from "we ran out of time". */
export class RequestDeadlineExceededError extends Error {
  readonly name = 'RequestDeadlineExceededError'
  /** The failure that kept retrying until the budget ran out. Without it the
   * telemetry records only "ran out of time" and loses the actual diagnosis —
   * a 503 storm and a slow-but-healthy model look identical. */
  readonly lastError: unknown

  constructor(remainingMs: number, lastError?: unknown) {
    const detail =
      lastError instanceof Error
        ? `; last error: ${lastError.message.slice(0, 200)}`
        : ''
    super(
      `Request deadline exceeded (${remainingMs}ms remaining) — stopped before the function was killed${detail}`
    )
    this.lastError = lastError
    if (lastError !== undefined) this.cause = lastError
  }
}

export function isRequestDeadlineError(err: unknown): boolean {
  return err instanceof RequestDeadlineExceededError
}

/** Smallest timeout worth issuing — below this the call cannot even connect. */
export const MIN_CALL_TIMEOUT_MS = 1_000

/**
 * Clamp a per-call timeout to the remaining budget so no single call can
 * outlive the request. Returns `desiredMs` when unbounded.
 *
 * The clamp must never exceed what is actually left. An earlier version applied
 * a 5s floor unconditionally, so a budget with 4s remaining produced a 5s
 * timeout — longer than the whole remaining budget, and eating the settle
 * reserve it exists to protect. When the budget is spent the call is doomed
 * either way; the job here is to make it fail *fast* rather than overshoot.
 */
export function clampTimeoutToDeadline(desiredMs: number): number {
  const remaining = remainingRequestMs()
  if (remaining == null) return desiredMs
  // Leave a slice for settling work (reservation release, telemetry, SSE error).
  const usable = remaining - SETTLE_RESERVE_MS
  // Budget already spent: fail immediately instead of starting a doomed call.
  if (usable <= 0) return MIN_CALL_TIMEOUT_MS
  // Never more than what is actually left. If that is very small the call will
  // fail fast, which is the point — a call with 400ms left cannot succeed, and
  // pretending otherwise just eats the settle reserve.
  return Math.min(desiredMs, usable)
}

/** Wall-clock kept in reserve for post-failure bookkeeping. */
export const SETTLE_RESERVE_MS = 3_000

/**
 * True when there is plausibly enough time for another attempt that takes
 * `estimatedMs` after waiting `delayMs`. Used by the retry loop to stop early
 * instead of starting an attempt that cannot finish.
 */
export function hasTimeForAnotherAttempt(
  delayMs: number,
  estimatedMs: number
): boolean {
  const remaining = remainingRequestMs()
  if (remaining == null) return true
  return remaining - SETTLE_RESERVE_MS > delayMs + estimatedMs
}
