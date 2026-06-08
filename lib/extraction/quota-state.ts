import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export type BulkQuotaState = {
  quota_exhausted_at: string
  /** ISO timestamp — earliest safe resume time */
  retry_after: string
  retry_delay_ms: number
  model?: string
  message?: string
}

const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

export function readQuotaState(statePath: string): BulkQuotaState | null {
  if (!existsSync(statePath)) return null
  try {
    const raw = JSON.parse(readFileSync(statePath, 'utf8')) as BulkQuotaState
    if (!raw.quota_exhausted_at || !raw.retry_after) return null
    return raw
  } catch {
    return null
  }
}

export function writeQuotaState(statePath: string, state: BulkQuotaState): void {
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify(state, null, 2))
}

export function clearQuotaState(statePath: string): void {
  if (!existsSync(statePath)) return
  writeFileSync(statePath, JSON.stringify({ cleared_at: new Date().toISOString() }, null, 2))
}

/** Block until retry_after if quota was hit within the last 24h. */
export async function waitIfQuotaBlocked(
  statePath: string,
  log?: (line: string) => void
): Promise<boolean> {
  const state = readQuotaState(statePath)
  if (!state) return false

  const exhaustedAt = new Date(state.quota_exhausted_at).getTime()
  if (Date.now() - exhaustedAt > QUOTA_WINDOW_MS) return false

  const retryAfter = new Date(state.retry_after).getTime()
  const waitMs = retryAfter - Date.now()
  if (waitMs <= 0) return false

  const mins = Math.ceil(waitMs / 60_000)
  log?.(
    `QUOTA PAUSE: Gemini daily quota exhausted at ${state.quota_exhausted_at}; waiting ${mins}m until ${state.retry_after}`
  )
  await new Promise((r) => setTimeout(r, waitMs))
  return true
}

export class QuotaExhaustedError extends Error {
  readonly retryAfterMs: number
  readonly retryAfter: string

  constructor(message: string, retryDelayMs: number) {
    super(message)
    this.name = 'QuotaExhaustedError'
    this.retryAfterMs = retryDelayMs
    this.retryAfter = new Date(Date.now() + retryDelayMs).toISOString()
  }
}
