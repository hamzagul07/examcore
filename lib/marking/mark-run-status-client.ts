/**
 * Client side of `/api/mark/run-status`.
 *
 * Two things read a run's fate after the stream that was reporting it is
 * gone: the app-wide PendingMarkWatcher, and /mark itself when the connection
 * drops mid-mark (or the server replies `duplicate: true` to a retry). Both
 * used to grow their own fetch + response parsing; this is the one copy, with
 * the response classification kept pure so it can be tested without a network.
 */

export type MarkRunStatusPayload = {
  status?: string
  settled?: boolean
  attempt_id?: string | null
  subject_code?: string | null
  marks_earned?: number | null
  total_marks?: number | null
}

export type MarkRunOutcome = {
  /** 'success' | 'error' | 'abandoned' — whatever the run row says. */
  status: string
  attemptId: string | null
  marksEarned: number | null
  totalMarks: number | null
  /** A result the student can be shown: the run succeeded and saved an attempt. */
  ok: boolean
}

export type MarkRunStatusResult =
  /** Still running — poll again. */
  | { kind: 'running' }
  /** Finished, one way or the other. */
  | { kind: 'settled'; outcome: MarkRunOutcome }
  /** Not ours to watch (signed out, or the row is gone) — stop for good. */
  | { kind: 'gone' }
  /** Offline / 5xx / malformed — try again on the next tick. */
  | { kind: 'transient' }

/** Pure: what a status response means for the caller. */
export function classifyRunStatus(
  httpStatus: number,
  body: MarkRunStatusPayload | null
): MarkRunStatusResult {
  // A 403/404 means this run is not ours (signed out, or the row is gone).
  // Stop rather than poll a dead id for twenty minutes.
  if (httpStatus === 403 || httpStatus === 404) return { kind: 'gone' }
  if (httpStatus < 200 || httpStatus >= 300 || !body) return { kind: 'transient' }
  if (!body.settled) return { kind: 'running' }
  const status = typeof body.status === 'string' ? body.status : 'error'
  const attemptId = body.attempt_id ?? null
  return {
    kind: 'settled',
    outcome: {
      status,
      attemptId,
      marksEarned: body.marks_earned ?? null,
      totalMarks: body.total_marks ?? null,
      ok: status === 'success' && !!attemptId,
    },
  }
}

export async function fetchMarkRunStatus(
  markRunId: string,
  signal?: AbortSignal
): Promise<MarkRunStatusResult> {
  try {
    const res = await fetch(
      `/api/mark/run-status?mark_run_id=${encodeURIComponent(markRunId)}`,
      { cache: 'no-store', signal }
    )
    const body = (await res.json().catch(() => null)) as MarkRunStatusPayload | null
    return classifyRunStatus(res.status, body)
  } catch {
    return { kind: 'transient' }
  }
}

/**
 * How often /mark asks after a run it lost the stream to. Faster than the
 * background watcher's 15s — the student is looking at a wait screen — but
 * still a function invocation per tick, so not a progress bar.
 */
export const ATTACHED_RUN_POLL_MS = 5_000

/**
 * Poll until the run settles or is gone. Resolves 'gone' after `maxWaitMs`
 * too: the sweep gives a run up at 20 minutes, so past that there is nothing
 * left to wait for. Rejects only on abort.
 */
export async function pollMarkRunUntilSettled(
  markRunId: string,
  options: {
    signal?: AbortSignal
    intervalMs?: number
    maxWaitMs?: number
    fetchStatus?: typeof fetchMarkRunStatus
  } = {}
): Promise<Extract<MarkRunStatusResult, { kind: 'settled' | 'gone' }>> {
  const {
    signal,
    intervalMs = ATTACHED_RUN_POLL_MS,
    maxWaitMs = 20 * 60_000,
    fetchStatus = fetchMarkRunStatus,
  } = options
  const startedAt = Date.now()
  while (true) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const result = await fetchStatus(markRunId, signal)
    if (result.kind === 'settled' || result.kind === 'gone') return result
    if (Date.now() - startedAt >= maxWaitMs) return { kind: 'gone' }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, intervalMs)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(new DOMException('aborted', 'AbortError'))
        },
        { once: true }
      )
    })
  }
}
