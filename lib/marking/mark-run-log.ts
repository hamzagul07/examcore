import { createClient } from '@supabase/supabase-js'
import { getGeminiRetryStats } from '@/lib/marking/gemini-retry'
import { requestRetryCount } from '@/lib/ai/request-deadline'
import type { MarkingErrorCode } from '@/lib/marking/classify-marking-error'
import type { MarkProgressStage } from '@/lib/marking/mark-progress'

/**
 * Marking reliability telemetry.
 *
 * `attempts` rows only exist once a mark fully succeeds, which made every
 * failure — timeout, parse error, function killed mid-stream — invisible. A
 * `mark_runs` row is opened BEFORE any model call and settled at the end, so a
 * run that never settles is itself the evidence that the function died.
 *
 * Every function here is best-effort and never throws: telemetry must not be
 * able to fail a mark.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type MarkRunHandle = {
  id: string | null
  startedAt: number
  /** Global retry counter read at open, so we can report this run's delta. */
  retriesAtStart: number
  /** Last stage the pipeline reported; recorded on whichever way the run ends. */
  lastStage: MarkProgressStage | null
}

export type MarkRunOpenInput = {
  userId: string | null
  uploadMode: string
  markIntent: string
  pageCount: number
  hasPdf: boolean
  isPaid: boolean
  subjectCode: string | null
}

/** Open a run row. Returns a handle with a null id if logging is unavailable —
 * callers pass it through unchanged and the settle helpers no-op. */
export async function openMarkRun(
  input: MarkRunOpenInput
): Promise<MarkRunHandle> {
  const handle: MarkRunHandle = {
    id: null,
    startedAt: Date.now(),
    retriesAtStart: getGeminiRetryStats().totalRetries,
    lastStage: null,
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('mark_runs')
      .insert({
        user_id: input.userId,
        status: 'running',
        upload_mode: input.uploadMode,
        mark_intent: input.markIntent,
        page_count: input.pageCount,
        has_pdf: input.hasPdf,
        is_paid: input.isPaid,
        subject_code: input.subjectCode,
      })
      .select('id')
      .single()
    if (error) throw error
    handle.id = data?.id ?? null
  } catch (err) {
    console.warn('[mark-run] open failed (marking continues)', err)
  }
  return handle
}

/**
 * Record the stage the pipeline most recently reached.
 *
 * Also flushed to the row immediately, fire-and-forget. Keeping it in memory
 * until settle made the column useless for the one case it was added for: a
 * killed function never settles, so `last_stage` stayed NULL on exactly the
 * rows the sweep later marks 'abandoned' — leaving no clue where they died.
 * The write is not awaited, so it stays off the critical path.
 */
export function noteMarkRunStage(
  handle: MarkRunHandle | null,
  stage: MarkProgressStage
): void {
  if (!handle) return
  if (handle.lastStage === stage) return // stages can repeat; don't re-write
  handle.lastStage = stage
  if (!handle.id) return
  void supabaseAdmin
    .from('mark_runs')
    .update({ last_stage: stage })
    .eq('id', handle.id)
    .then(undefined, (err: unknown) =>
      console.warn('[mark-run] stage flush failed', err)
    )
}

function retryCount(handle: MarkRunHandle): number {
  // Prefer the request-scoped counter: it counts only THIS request's retries and
  // is immune to the module-global counter, which extraction jobs reset mid-run
  // — that reset used to make this report 0 during a genuine retry storm.
  const scoped = requestRetryCount()
  if (scoped != null) return scoped
  // No request context (batch scripts): fall back to the global delta, clamped.
  // Still weak — concurrent marks inflate it — but there is nothing better here.
  return Math.max(0, getGeminiRetryStats().totalRetries - handle.retriesAtStart)
}

export async function settleMarkRunSuccess(
  handle: MarkRunHandle | null,
  attemptId: string | null
): Promise<void> {
  if (!handle?.id) return
  try {
    await supabaseAdmin
      .from('mark_runs')
      .update({
        status: 'success',
        attempt_id: attemptId,
        last_stage: handle.lastStage,
        duration_ms: Date.now() - handle.startedAt,
        gemini_retries: retryCount(handle),
        finished_at: new Date().toISOString(),
      })
      .eq('id', handle.id)
  } catch (err) {
    console.warn('[mark-run] success settle failed', err)
  }
}

export async function settleMarkRunError(
  handle: MarkRunHandle | null,
  code: MarkingErrorCode,
  message: string
): Promise<void> {
  if (!handle?.id) return
  try {
    await supabaseAdmin
      .from('mark_runs')
      .update({
        status: 'error',
        error_code: code,
        error_message: message.slice(0, 600),
        last_stage: handle.lastStage,
        duration_ms: Date.now() - handle.startedAt,
        gemini_retries: retryCount(handle),
        finished_at: new Date().toISOString(),
      })
      .eq('id', handle.id)
  } catch (err) {
    console.warn('[mark-run] error settle failed', err)
  }
}

/**
 * Age past which a still-'running' row is treated as a killed function. Must
 * exceed the longest legitimate run (the route's maxDuration, clamped by the
 * plan to 300s) with headroom for the settling write itself.
 */
export const MARK_RUN_STALE_MINUTES = 20

/** Sweep runs the function never settled — these are the invisible failures.
 * Returns how many were reclassified. */
export async function sweepStaleMarkRuns(): Promise<number> {
  const cutoff = new Date(
    Date.now() - MARK_RUN_STALE_MINUTES * 60_000
  ).toISOString()
  try {
    const { data, error } = await supabaseAdmin
      .from('mark_runs')
      .update({
        status: 'abandoned',
        error_code: 'function_killed',
        error_message:
          'Run never settled — the function was killed or the client disconnected mid-stream.',
        finished_at: new Date().toISOString(),
      })
      .eq('status', 'running')
      .lt('started_at', cutoff)
      .select('id')
    if (error) throw error
    return data?.length ?? 0
  } catch (err) {
    console.warn('[mark-run] sweep failed', err)
    return 0
  }
}
