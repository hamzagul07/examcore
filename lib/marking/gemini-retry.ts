import {
  hasTimeForAnotherAttempt,
  noteRequestRetry,
  remainingRequestMs,
  RequestDeadlineExceededError,
} from '@/lib/ai/request-deadline'

const GEMINI_RETRYABLE_STATUS = [429, 500, 502, 503, 504]

/** Thrown when a Gemini/Vertex HTTP call exceeds the per-request timeout. */
export class GeminiTimeoutError extends Error {
  readonly name = 'GeminiTimeoutError'
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`)
    this.timeoutMs = timeoutMs
  }
}

export function isGeminiTimeoutError(err: unknown): boolean {
  return err instanceof GeminiTimeoutError
}

const OVERLOAD_PATTERN =
  /UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded|rate.?limit/i

const TRANSIENT_NETWORK_PATTERN =
  /fetch failed|Headers Timeout|UND_ERR_HEADERS_TIMEOUT|ECONNRESET|ETIMEDOUT|socket hang up|network|timeout/i

type RetryOpts = {
  maxRetries?: number
  baseDelayMs?: number
  label?: string
}

let _totalRetries = 0
let _rateLimitRetries = 0
let _lastRetryLabel: string | null = null

/** Reset before each extraction job; read after for extraction_jobs.error_message. */
export function resetGeminiRetryStats(): void {
  _totalRetries = 0
  _rateLimitRetries = 0
  _lastRetryLabel = null
}

export function getGeminiRetryStats(): {
  totalRetries: number
  rateLimitRetries: number
  lastLabel: string | null
} {
  return {
    totalRetries: _totalRetries,
    rateLimitRetries: _rateLimitRetries,
    lastLabel: _lastRetryLabel,
  }
}

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  const nested = e.error as Record<string, unknown> | undefined
  if (nested && typeof nested.code === 'number') return nested.code
  const response = e.response as Record<string, unknown> | undefined
  if (response && typeof response.status === 'number') return response.status
  return undefined
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return ''
}

function errorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object' && 'code' in cause) {
    const code = (cause as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  if ('code' in err) {
    const code = (err as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

function isRetryableMessage(message: string): boolean {
  return OVERLOAD_PATTERN.test(message) || TRANSIENT_NETWORK_PATTERN.test(message)
}

function isTransientNetworkError(err: unknown): boolean {
  const message = errorMessage(err)
  const code = errorCode(err)
  if (code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return true
  }
  return TRANSIENT_NETWORK_PATTERN.test(message)
}

/** Honor Gemini retryDelay / "Please retry in Ns" hints on transient 429s. */
function parseApiRetryDelayMs(err: unknown): number | null {
  const message = errorMessage(err)
  const retryDelay = message.match(/"retryDelay"\s*:\s*"(\d+)s"/)
  if (retryDelay) return Number(retryDelay[1]) * 1000 + 250
  const pleaseRetrySec = message.match(/Please retry in ([\d.]+)s/i)
  if (pleaseRetrySec) return Math.ceil(Number(pleaseRetrySec[1]) * 1000) + 250
  const pleaseRetryMin = message.match(/Please retry in (\d+)m(\d+)s/i)
  if (pleaseRetryMin) {
    return (
      Number(pleaseRetryMin[1]) * 60_000 +
      Number(pleaseRetryMin[2]) * 1000 +
      250
    )
  }
  return null
}

function retryDelayMs(
  err: unknown,
  attempt: number,
  baseDelayMs: number
): number {
  const apiDelay = parseApiRetryDelayMs(err)
  if (apiDelay != null) return Math.min(apiDelay, 30_000)
  return Math.min(baseDelayMs * 2 ** attempt, 12_000) + Math.random() * 500
}

async function withApiRetry<T>(
  fn: () => Promise<T>,
  retryableStatus: number[],
  opts: RetryOpts = {}
): Promise<T> {
  const { maxRetries = 8, baseDelayMs = 1000, label = 'api' } = opts
  let lastErr: unknown
  // Observed cost of the slowest attempt so far — the basis for deciding
  // whether another attempt can plausibly finish inside the request budget.
  let slowestAttemptMs = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartedAt = Date.now()
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      slowestAttemptMs = Math.max(slowestAttemptMs, Date.now() - attemptStartedAt)
      const status = extractStatus(err)
      const message = errorMessage(err)
      const isRetryable =
        isGeminiTimeoutError(err) ||
        (status !== undefined && retryableStatus.includes(status)) ||
        isRetryableMessage(message) ||
        isTransientNetworkError(err)

      if (!isRetryable || attempt === maxRetries) break

      if (isGeminiQuotaExhausted(err)) break

      const delay = retryDelayMs(err, attempt, baseDelayMs)

      // Budget guard. Without this a sticky 503 burns every retry slot, the
      // platform kills the function mid-stream, and the caller never gets to
      // release its reservation, settle telemetry, or send an error event.
      // Stopping here fails the request *inside* its own handler instead.
      if (!hasTimeForAnotherAttempt(delay, slowestAttemptMs)) {
        console.warn(
          `[${label}] out of request budget after ${attempt + 1} attempt(s) — stopping retries`
        )
        throw new RequestDeadlineExceededError(remainingRequestMs() ?? 0, err)
      }

      _totalRetries++
      if (status === 429) _rateLimitRetries++
      _lastRetryLabel = label
      // Also count against the current request (immune to the global counter's
      // resets), so mark_runs.gemini_retries stays accurate under concurrency.
      noteRequestRetry()

      console.warn(
        `[${label}] retryable error (status ${status ?? errorCode(err) ?? 'unknown'}), attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastErr
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {}
): Promise<T> {
  return withApiRetry(fn, GEMINI_RETRYABLE_STATUS, {
    label: 'gemini',
    ...opts,
  })
}

const DAILY_QUOTA_PATTERN =
  /generate_requests_per_model_per_day|GenerateRequestsPerDayPerProjectPerModel|quota exceeded for metric/i

/** True when Gemini daily quota is exhausted (not a transient rate limit). */
export function isGeminiQuotaExhausted(err: unknown): boolean {
  const message = errorMessage(err)
  if (!/RESOURCE_EXHAUSTED|quota exceeded/i.test(message)) return false
  if (DAILY_QUOTA_PATTERN.test(message)) return true
  if (/Please retry in \d+h\d+m/i.test(message)) return true
  try {
    const parsed = JSON.parse(message) as { error?: { status?: string; code?: number } }
    if (parsed.error?.status === 'RESOURCE_EXHAUSTED' && parsed.error?.code === 429) {
      return DAILY_QUOTA_PATTERN.test(message) || /Please retry in \d+h/i.test(message)
    }
  } catch {
    /* not JSON */
  }
  return false
}

/** Parse retry delay from Gemini quota error (ms). Defaults to 12h if unknown. */
export function parseQuotaRetryDelayMs(err: unknown): number {
  const message = errorMessage(err)
  const hours = message.match(/Please retry in (\d+)h(\d+)m/)
  if (hours) {
    return (
      Number(hours[1]) * 3_600_000 +
      Number(hours[2]) * 60_000 +
      5 * 60_000
    )
  }
  const retryDelay = message.match(/"retryDelay"\s*:\s*"(\d+)s"/)
  if (retryDelay) return Number(retryDelay[1]) * 1000 + 5 * 60_000
  return 12 * 3_600_000
}

export function isTransientOverloadError(err: unknown): boolean {
  const status = extractStatus(err)
  if (
    status !== undefined &&
    [...GEMINI_RETRYABLE_STATUS, 529].includes(status)
  ) {
    return true
  }
  return isRetryableMessage(errorMessage(err)) || isTransientNetworkError(err)
}
