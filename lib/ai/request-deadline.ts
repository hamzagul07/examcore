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

/** Gemini backends, mirrored here so this module stays free of AI imports. */
export type GeminiBackendId = 'vertex' | 'api-key'

type DeadlineContext = {
  deadlineAt: number
  /** Gemini retries during THIS request. Request-scoped so it is immune to the
   * module-global retry counter, which extraction jobs reset mid-run — that
   * reset made mark_runs.gemini_retries report 0 during an actual retry storm. */
  retries: number
  /**
   * Backend this request has failed over to, if any.
   *
   * Request-scoped for the same reason the deadline is: one mark hitting a 429
   * on Vertex must not move every other in-flight mark onto the API key. Null
   * until a capacity error actually forces the switch.
   */
  backendOverride: GeminiBackendId | null
  /**
   * Whether this request has already spent its one failover.
   *
   * Without it, two providers that are both busy get ping-ponged between: each
   * switch is refused only when it targets the backend we are currently on, so
   * A→B→A→B is legal and every hop skips the backoff. That burns the retry
   * budget in seconds and fails a mark that waiting would have completed.
   * One re-route, then back to honest backoff.
   */
  backendSwitched: boolean

  /**
   * How many OCR reads this request escalated from Flash to Pro, and how many
   * of those the stronger read actually rescued.
   *
   * Scoped like `retries` and for the same reason: several marks are in flight
   * at once, so a module global would attribute one student's bad photo to
   * whoever else happened to be marking. Counted because the escalation was
   * added on a single script — Flash failed it twice, Pro read it cleanly — and
   * one case cannot say whether the trigger is too tight or too loose.
   */
  ocrEscalations: number
  ocrEscalationsKept: number
}

const deadlineStore = new AsyncLocalStorage<DeadlineContext>()

/** Record one retry against the current request, if there is one. Called by the
 * Gemini retry loop; a no-op outside a request (batch scripts). */
export function noteRequestRetry(): void {
  const ctx = deadlineStore.getStore()
  if (ctx) ctx.retries += 1
}

/** Record that a transcription was escalated to the stronger model. `kept` says
 * whether the second read was legible enough to use; a rescue and a wasted call
 * cost the same and must not be counted the same. No-op outside a request. */
export function noteOcrEscalation(kept: boolean): void {
  const ctx = deadlineStore.getStore()
  if (!ctx) return
  ctx.ocrEscalations += 1
  if (kept) ctx.ocrEscalationsKept += 1
}

/** OCR escalations in the current request: {tried, kept}, or null outside one. */
export function requestOcrEscalations(): { tried: number; kept: number } | null {
  const ctx = deadlineStore.getStore()
  return ctx ? { tried: ctx.ocrEscalations, kept: ctx.ocrEscalationsKept } : null
}

/** Retries seen in the current request, or null when unbounded (no request). */
export function requestRetryCount(): number | null {
  return deadlineStore.getStore()?.retries ?? null
}

/** The backend this request has failed over to, or null for the configured one. */
export function requestBackendOverride(): GeminiBackendId | null {
  return deadlineStore.getStore()?.backendOverride ?? null
}

/**
 * Move this request onto `backend` for its remaining model calls.
 *
 * Returns false outside a request scope, when the request is already on that
 * backend, or when it has already failed over once — a request gets exactly one
 * re-route, after which a capacity error means both providers are busy and
 * waiting is the only honest answer.
 */
export function setRequestBackendOverride(backend: GeminiBackendId): boolean {
  const ctx = deadlineStore.getStore()
  if (!ctx || ctx.backendSwitched || ctx.backendOverride === backend) return false
  ctx.backendOverride = backend
  ctx.backendSwitched = true
  return true
}

/** Run `fn` with a wall-clock budget of `budgetMs` from now. */
export function withRequestDeadline<T>(
  budgetMs: number,
  fn: () => Promise<T>
): Promise<T> {
  return deadlineStore.run(
    {
      deadlineAt: Date.now() + budgetMs,
      retries: 0,
      backendOverride: null,
      backendSwitched: false,
      ocrEscalations: 0,
      ocrEscalationsKept: 0,
    },
    fn
  )
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
