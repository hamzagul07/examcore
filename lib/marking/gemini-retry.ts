const GEMINI_RETRYABLE_STATUS = [429, 500, 503]
const ANTHROPIC_RETRYABLE_STATUS = [429, 500, 502, 503, 529]

const OVERLOAD_PATTERN =
  /UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded|rate.?limit/i

type RetryOpts = {
  maxRetries?: number
  baseDelayMs?: number
  label?: string
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

function isRetryableMessage(message: string): boolean {
  return OVERLOAD_PATTERN.test(message)
}

async function withApiRetry<T>(
  fn: () => Promise<T>,
  retryableStatus: number[],
  opts: RetryOpts = {}
): Promise<T> {
  const { maxRetries = 4, baseDelayMs = 1000, label = 'api' } = opts
  let lastErr: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      const status = extractStatus(err)
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' &&
              err !== null &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : ''
      const isRetryable =
        (status !== undefined && retryableStatus.includes(status)) ||
        isRetryableMessage(message)

      if (!isRetryable || attempt === maxRetries) break

      const delay =
        Math.min(baseDelayMs * 2 ** attempt, 15000) + Math.random() * 500
      console.warn(
        `[${label}] retryable error (status ${status ?? 'unknown'}), attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`
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

export async function withAnthropicRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {}
): Promise<T> {
  return withApiRetry(fn, ANTHROPIC_RETRYABLE_STATUS, {
    label: 'anthropic',
    ...opts,
  })
}

export function isTransientOverloadError(err: unknown): boolean {
  const status = extractStatus(err)
  if (
    status !== undefined &&
    [...GEMINI_RETRYABLE_STATUS, 529].includes(status)
  ) {
    return true
  }
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : ''
  return isRetryableMessage(message)
}
