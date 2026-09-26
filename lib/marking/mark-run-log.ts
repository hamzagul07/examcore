import { createClient } from '@supabase/supabase-js'
import { getGeminiRetryStats } from '@/lib/marking/gemini-retry'
import { requestOcrEscalations, requestRetryCount } from '@/lib/ai/request-deadline'
import type { MarkingErrorCode } from '@/lib/marking/classify-marking-error'
import type { MarkProgressStage } from '@/lib/marking/mark-progress'
import {
  classifyMarkRunWriteError,
  isMissingOptionalColumnError,
  type MarkRunDbError,
} from '@/lib/marking/mark-run-errors'

// Re-exported for the route that reuses a run row; the classification lives
// in mark-run-errors.ts so it can be unit-tested without a Supabase client.
export { isMissingOptionalColumnError } from '@/lib/marking/mark-run-errors'

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
  /** Client-generated idempotency key — lets a retried upload find its
   * original run instead of starting (and charging) a second one. */
  clientRequestId?: string | null
  /**
   * Who the key belongs to (lib/rate-limit clientScopeKey: user id, or a
   * hashed IP for a guest). Written with the insert so the unique index on
   * (client_scope, client_request_id) decides the race at the row itself;
   * an UPDATE after the insert left a window in which two uploads with one
   * key could both be running.
   */
  clientScope?: string | null
  /**
   * Whole-paper runs mark an attempt that already exists (created at init),
   * so the link can be written at open rather than at settle.
   */
  attemptId?: string | null
  /**
   * The quota reservation this run is holding (MarkReservation.event_id), when
   * it is known before the row is opened. Otherwise noteMarkRunReservation.
   */
  reservationEventId?: string | null
}

/**
 * Thrown by openMarkRun when the insert trips the (client_scope,
 * client_request_id) unique index: another upload with the same key is
 * already on a row. The caller — not this module — knows how to answer that
 * (release its reservation, refund the guest slot, return `duplicate: true`
 * with the winner's run id). Telemetry failures of every other kind are
 * swallowed as before; this one is not a telemetry failure but the
 * idempotency contract doing its job.
 */
export class MarkRunDuplicateKeyError extends Error {
  constructor(
    readonly clientScope: string | null,
    readonly clientRequestId: string
  ) {
    super('A marking run with this client_request_id already exists')
    this.name = 'MarkRunDuplicateKeyError'
  }
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
    client_request_id: input.clientRequestId ?? null,
    attempt_id: input.attemptId ?? null,
  }
  try {
    // Prefer the full row; fall back to the original column set if a
    // migration has not been applied yet (OPTIONAL_RUN_COLUMNS in
    // mark-run-errors.ts).
    //
    // The unique violation is tested BEFORE the missing-column fallback, and
    // again after it. The scoped index's name contains `client_scope`, so a
    // same-second duplicate used to read as "column not migrated", the row
    // was re-inserted without its scope, that insert succeeded, and the
    // losing upload ran and charged anyway. See classifyMarkRunWriteError.
    const duplicate = (error: MarkRunDbError) =>
      !!input.clientRequestId && classifyMarkRunWriteError(error) === 'unique_violation'
    let result = await supabaseAdmin
      .from('mark_runs')
      .insert({
        ...baseRow,
        exam_system: input.examSystem ?? null,
        reservation_event_id: input.reservationEventId ?? null,
        client_scope: input.clientScope ?? null,
      })
      .select('id')
      .single()
    if (result.error && duplicate(result.error)) {
      // Two uploads with one key inside the same second: this one is the
      // loser. Not swallowed.
      throw new MarkRunDuplicateKeyError(input.clientScope ?? null, input.clientRequestId!)
    }
    if (result.error && classifyMarkRunWriteError(result.error) === 'missing_optional_column') {
      result = await supabaseAdmin
        .from('mark_runs')
        .insert(baseRow)
        .select('id')
        .single()
      if (result.error && duplicate(result.error)) {
        // Pre-migration: the old GLOBAL index on client_request_id.
        throw new MarkRunDuplicateKeyError(input.clientScope ?? null, input.clientRequestId!)
      }
    }
    if (result.error) throw result.error
    handle.id = result.data?.id ?? null
  } catch (err) {
    if (err instanceof MarkRunDuplicateKeyError) throw err
    console.warn('[mark-run] open failed (marking continues)', err)
  }
  return handle
}

export type WholePaperMarkRunInput = {
  userId: string | null
  /** The attempt row created at whole-paper init. */
  attemptId: string
  pageCount: number
  hasPdf: boolean
  isPaid: boolean
  subjectCode: string | null
  examSystem?: string | null
  reservationEventId?: string | null
}

/**
 * Open a run row for a whole-paper job.
 *
 * Whole-paper marking never opened one, so a killed `run` was invisible: not
 * to the sweep, not to run-status, not to PendingMarkWatcher. The attempt sat
 * in phase 'marking' for good and the client polled until it gave up. Same
 * row shape as a single-question run — `upload_mode` tells them apart in
 * mark_run_daily_stats — with the attempt linked at open because it already
 * exists. Settle with settleMarkRunSuccess / settleMarkRunError as usual.
 */
export async function openWholePaperMarkRun(
  input: WholePaperMarkRunInput
): Promise<MarkRunHandle> {
  return openMarkRun({
    userId: input.userId,
    uploadMode: 'whole_paper',
    // A whole paper is a past paper; `upload_mode` is the discriminator.
    markIntent: 'past_paper',
    pageCount: input.pageCount,
    hasPdf: input.hasPdf,
    isPaid: input.isPaid,
    subjectCode: input.subjectCode,
    examSystem: input.examSystem ?? null,
    attemptId: input.attemptId,
    reservationEventId: input.reservationEventId ?? null,
  })
}

/**
 * Record the quota reservation this run is holding, so the sweep can give it
 * back if the function dies.
 *
 * A reservation is settled by the route — finalize on success, release on
 * failure — and a killed function reaches neither. The sweep converts those
 * runs to 'abandoned', but until now it had no idea what they were holding,
 * so the student permanently lost a mark (or a credit) for a mark they never
 * got. Flushed immediately, fire-and-forget, like the stage: it exists for
 * exactly the runs that never settle.
 *
 * The reservation is usually made before the row is opened; pass it to
 * openMarkRun instead when both are in hand. `null` is a no-op (guests).
 */
export function noteMarkRunReservation(
  handle: MarkRunHandle | null,
  eventId: string | null
): void {
  if (!handle?.id || !eventId) return
  void supabaseAdmin
    .from('mark_runs')
    .update({ reservation_event_id: eventId })
    .eq('id', handle.id)
    .then(
      ({ error }) => {
        if (error && !isMissingOptionalColumnError(error)) {
          console.warn('[mark-run] reservation flush failed', error.message)
        }
      },
      (err: unknown) => console.warn('[mark-run] reservation flush failed', err)
    )
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
 * Record what the first marking pass scored, and what survived verification.
 *
 * The verify result replaces the first pass unconditionally and in either
 * direction, and nothing recorded that they had disagreed — so whether that
 * second opinion improves marks or degrades them was unanswerable except by
 * anecdote. Two observed cases point opposite ways: an essay moved 10 to 11 out
 * of 12, and a three-mark question moved 1 to 0 against a scheme that plainly
 * awards the mark.
 *
 * The pair now also records when a verify response was REJECTED as incomplete
 * (see verify-result.ts): both columns retain the first-pass score. That gate
 * exists because a summary-only response could replace a correct 7/8 with a
 * coerced 0/8 — which is the extreme of the same variance these two columns were
 * added to measure.
 *
 * Fire-and-forget, like the stage flush. Telemetry must not be able to fail a
 * mark.
 */
export function noteMarkRunVerify(
  handle: MarkRunHandle | null,
  marks: { firstPass?: number | null; final?: number | null }
): void {
  if (!handle?.id) return
  const patch: Record<string, number> = {}
  if (typeof marks.firstPass === 'number') patch.first_pass_marks = marks.firstPass
  if (typeof marks.final === 'number') patch.final_marks = marks.final
  if (Object.keys(patch).length === 0) return
  void supabaseAdmin
    .from('mark_runs')
    .update(patch)
    .eq('id', handle.id)
    .then(undefined, (err: unknown) =>
      console.warn('[mark-run] verify delta flush failed', err)
    )
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
 * A PDF's page count is only known once it is opened, which is after the run
 * row was written with 0 — every PDF run logged page_count 0, which is how a
 * 57% PDF failure rate hid behind "page_count 0" for a month.
 */
export function noteMarkRunPageCount(handle: MarkRunHandle | null, pageCount: number): void {
  if (!handle?.id || !Number.isFinite(pageCount) || pageCount < 1) return
  void supabaseAdmin
    .from('mark_runs')
    .update({ page_count: Math.round(pageCount) })
    .eq('id', handle.id)
    .then(undefined, (err: unknown) =>
      console.warn('[mark-run] page count flush failed', err)
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
  // Read at settle rather than held on the handle: the counter is request-scoped
  // so it already belongs to this mark, and reading it here means the OCR path
  // never has to know a mark_runs row exists.
  const ocr = requestOcrEscalations()
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
      ocr_escalations: ocr?.tried ?? null,
      ocr_escalations_kept: ocr?.kept ?? null,
    })
    .eq('id', handle.id!)
  if (
    result.error &&
    /stage_timings|client_disconnected|ocr_escalations/i.test(result.error.message ?? '')
  ) {
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
 * exceed the longest legitimate run — `process` and whole-paper `run` both
 * export maxDuration = 800s — with headroom for the settling write itself.
 * This is also the earliest a reservation can be given back, so it must never
 * be shorter than a run that might still finalize.
 */
export const MARK_RUN_STALE_MINUTES = 20

/** A run the function never settled, as far as we can describe it afterwards. */
export type AbandonedMarkRun = {
  id: string
  user_id: string | null
  subject_code: string | null
  /** True when the student had already left — they were promised an email. */
  client_disconnected: boolean
  /** The quota reservation the run died holding, if the route recorded one. */
  reservation_event_id: string | null
}

const ABANDONED_COLUMNS = 'id, user_id, subject_code, client_disconnected'

function toAbandoned(r: Record<string, unknown>): AbandonedMarkRun {
  return {
    id: r.id as string,
    user_id: (r.user_id as string | null) ?? null,
    subject_code: (r.subject_code as string | null) ?? null,
    client_disconnected: r.client_disconnected === true,
    reservation_event_id: (r.reservation_event_id as string | null) ?? null,
  }
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
  const abandon = (columns: string) =>
    supabaseAdmin
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
      .select(columns)
  try {
    // The conditional update is what makes each run returned exactly once:
    // only rows this statement flipped come back, so two overlapping sweeps
    // cannot both act on the same run.
    let result = await abandon(`${ABANDONED_COLUMNS}, reservation_event_id`)
    if (result.error && isMissingOptionalColumnError(result.error)) {
      // Column not migrated yet: the statement failed at parse time, nothing
      // was flipped, so re-running without it is safe.
      result = await abandon(ABANDONED_COLUMNS)
    }
    if (result.error) throw result.error
    return ((result.data ?? []) as unknown as Record<string, unknown>[]).map(toAbandoned)
  } catch (err) {
    console.warn('[mark-run] sweep failed', err)
    return []
  }
}

/**
 * Abandoned runs whose reservation is still outstanding. The sweep releases
 * the reservation right after abandoning a run, but it can die in between;
 * these are the ones it owes from earlier, picked up on the next pass. Bounded
 * so a backlog cannot turn one cron invocation into a marathon.
 */
export async function listUnreleasedAbandonedRuns(limit = 200): Promise<AbandonedMarkRun[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('mark_runs')
      .select(`${ABANDONED_COLUMNS}, reservation_event_id`)
      .eq('status', 'abandoned')
      .not('reservation_event_id', 'is', null)
      .is('reservation_released_at', null)
      .order('started_at', { ascending: true })
      .limit(limit)
    if (error) {
      if (!isMissingOptionalColumnError(error)) throw error
      return []
    }
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(toAbandoned)
  } catch (err) {
    console.warn('[mark-run] unreleased lookup failed', err)
    return []
  }
}

/** Stamp a swept run as having had its reservation released. */
export async function markMarkRunReservationReleased(runId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('mark_runs')
    .update({ reservation_released_at: new Date().toISOString() })
    .eq('id', runId)
  if (error && !isMissingOptionalColumnError(error)) {
    console.warn('[mark-run] release stamp failed', error.message)
  }
}
