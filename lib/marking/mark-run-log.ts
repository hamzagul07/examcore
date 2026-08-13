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
  /** When `lastStage` began — the basis for charging elapsed time to it. */
  stageStartedAt: number
  /**
   * Elapsed ms per stage. `duration_ms` alone could only ever say "this took
   * 3 minutes"; it could never say which of OCR, scheme derivation, marking or
   * verification spent them, so every latency fix was a guess. Accumulated
   * rather than assigned, because a stage can be reported more than once.
   */
  stageMs: Record<string, number>
  /** Whether the client had already gone when the result was ready. */
  clientDisconnected: boolean
}

export type MarkRunOpenInput = {
  userId: string | null
  uploadMode: string
  markIntent: string
  pageCount: number
  hasPdf: boolean
  isPaid: boolean
  subjectCode: string | null
  /** ExamSystemId — cambridge | ib | edexcel (nullable for legacy rows). */
  examSystem?: string | null
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
    stageStartedAt: Date.now(),
    stageMs: {},
    clientDisconnected: false,
  }
  const baseRow = {
    user_id: input.userId,
    status: 'running' as const,
    upload_mode: input.uploadMode,
    mark_intent: input.markIntent,
    page_count: input.pageCount,
    has_pdf: input.hasPdf,
    is_paid: input.isPaid,
    subject_code: input.subjectCode,
  }
  try {
    // Prefer board-aware insert; fall back if migration not applied yet.
    let result = await supabaseAdmin
      .from('mark_runs')
      .insert({ ...baseRow, exam_system: input.examSystem ?? null })
      .select('id')
      .single()
    if (result.error && /exam_system/i.test(result.error.message ?? '')) {
      result = await supabaseAdmin
        .from('mark_runs')
        .insert(baseRow)
        .select('id')
        .single()
    }
    if (result.error) throw result.error
    handle.id = result.data?.id ?? null
  } catch (err) {
    console.warn('[mark-run] open failed (marking continues)', err)
  }
  return handle
}

/**
 * Bank the time since the last stage boundary against the stage that was
 * running, then reset the clock.
 *
 * Time before the first stage is reported belongs to no `MarkProgressStage` —
 * it is form parsing, auth, quota reservation and file decoding — so it is
 * charged to a synthetic `request_setup` key rather than silently dropped or
 * folded into whichever stage happened to be first.
 */
function chargeElapsedToCurrentStage(handle: MarkRunHandle): void {
  const now = Date.now()
  const key = handle.lastStage ?? 'request_setup'
  handle.stageMs[key] = (handle.stageMs[key] ?? 0) + (now - handle.stageStartedAt)
  handle.stageStartedAt = now
}

/**
 * The client left before the result could be sent — the run itself continues
 * server-side, and the mark is emailed instead.
 *
 * Flushed immediately rather than left for settle, because a disconnect can be
 * detected after the run has already been settled successfully (the result is
 * sent, and fails to enqueue, only once telemetry is closed).
 */
export function noteMarkRunDisconnect(handle: MarkRunHandle | null): void {
  if (!handle || handle.clientDisconnected) return
  handle.clientDisconnected = true
  if (!handle.id) return
  void supabaseAdmin
    .from('mark_runs')
    .update({ client_disconnected: true })
    .eq('id', handle.id)
    .then(undefined, (err: unknown) =>
      console.warn('[mark-run] disconnect flush failed', err)
    )
}

/**
 * Record the stage the pipeline most recently reached.
 *
 * Also flushed to the row immediately, fire-and-forget. Keeping it in memory
 * until settle made the column useless for the one case it was added for: a
 * killed function never settles, so `last_stage` stayed NULL on exactly the
 * rows the sweep later marks 'abandoned' — leaving no clue where they died.
 * The write is not awaited, so it stays off the critical path.
 *
 * The stage boundary is also where the previous stage's elapsed time is banked,
 * which is what turns `duration_ms` from one opaque number into an attributable
 * breakdown.
 */
export function noteMarkRunStage(
  handle: MarkRunHandle | null,
  stage: MarkProgressStage
): void {
  if (!handle) return
  if (handle.lastStage === stage) return // stages can repeat; don't re-write
  chargeElapsedToCurrentStage(handle)
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

/**
 * The score the student predicted during the wait, if they answered.
 *
 * Read back at completion rather than held in memory: the prediction arrives on
 * a separate request from the one doing the marking, so this process never saw
 * it. Returns null on any failure — a missing prediction is a missing sentence
 * in the result, never a failed mark.
 */
export async function readMarkRunPrediction(
  handle: MarkRunHandle | null
): Promise<number | null> {
  if (!handle?.id) return null
  try {
    const { data } = await supabaseAdmin
      .from('mark_runs')
      .select('predicted_marks')
      .eq('id', handle.id)
      .maybeSingle()
    const value = (data as { predicted_marks?: number | null } | null)
      ?.predicted_marks
    return typeof value === 'number' ? value : null
  } catch {
    return null
  }
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

/**
 * Write the terminal row. The final stage is charged first, so `stage_timings`
 * accounts for the whole run rather than stopping at the last boundary.
 *
 * Falls back to the pre-timing column set when the migration has not been
 * applied yet: a preview branch missing a column must not cost us the run's
 * telemetry, which is the one record that a failure happened at all.
 */
async function settleMarkRun(
  handle: MarkRunHandle,
  outcome: Record<string, unknown>
): Promise<void> {
  chargeElapsedToCurrentStage(handle)
  const base = {
    ...outcome,
    last_stage: handle.lastStage,
    duration_ms: Date.now() - handle.startedAt,
    gemini_retries: retryCount(handle),
    finished_at: new Date().toISOString(),
  }
  let result = await supabaseAdmin
    .from('mark_runs')
    .update({
      ...base,
      stage_timings: handle.stageMs,
      client_disconnected: handle.clientDisconnected,
    })
    .eq('id', handle.id!)
  if (result.error && /stage_timings|client_disconnected/i.test(result.error.message ?? '')) {
    result = await supabaseAdmin.from('mark_runs').update(base).eq('id', handle.id!)
  }
  if (result.error) throw result.error
}

export async function settleMarkRunSuccess(
  handle: MarkRunHandle | null,
  attemptId: string | null
): Promise<void> {
  if (!handle?.id) return
  try {
    await settleMarkRun(handle, { status: 'success', attempt_id: attemptId })
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
    await settleMarkRun(handle, {
      status: 'error',
      error_code: code,
      error_message: message.slice(0, 600),
    })
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

/** A run the function never settled, as far as we can describe it afterwards. */
export type AbandonedMarkRun = {
  id: string
  user_id: string | null
  subject_code: string | null
  /** True when the student had already left — they were promised an email. */
  client_disconnected: boolean
}

/**
 * Sweep runs the function never settled — these are the invisible failures.
 *
 * Returns the rows rather than a count so the caller can act on them. That
 * matters now that the wait screen tells students they may leave: a run killed
 * mid-flight reaches no catch block, so nothing else in the system will ever
 * tell them their mark is not coming. Silence after "we'll email you" is worse
 * than never having offered, and it is invisible to us precisely because those
 * students never come back to see an error.
 */
export async function sweepStaleMarkRuns(): Promise<AbandonedMarkRun[]> {
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
      .select('id, user_id, subject_code, client_disconnected')
    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id as string,
      user_id: (r.user_id as string | null) ?? null,
      subject_code: (r.subject_code as string | null) ?? null,
      client_disconnected: r.client_disconnected === true,
    }))
  } catch (err) {
    console.warn('[mark-run] sweep failed', err)
    return []
  }
}
