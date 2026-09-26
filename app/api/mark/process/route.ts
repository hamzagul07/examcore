import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiBackendLabel } from '@/lib/ai/gemini-config'
import {
  authenticateRouteRequest,
  warnIfAuthDropped,
} from '@/lib/supabase-server'
import { runSingleQuestionMark } from '@/lib/marking/single-question-pipeline'
import { formatSseEvent, SSE_HEADERS } from '@/lib/marking/sse'
import type { MarkIntent } from '@/lib/marking/types'
import {
  getGeminiRetryStats,
} from '@/lib/marking/gemini-retry'
import {
  classifyMarkingError,
  isUploadDecidedFailure,
  type ClassifiedMarkingError,
  type MarkingErrorCode,
} from '@/lib/marking/classify-marking-error'
import {
  BillingUnavailableError,
  reserveMarkUsage,
  finalizeMarkReservation,
  releaseMarkReservation,
  recordExtraMarkUsages,
  allowanceForResponse,
  maxQuestionsForReservation,
  quotaExceededBody,
  type MarkReservation,
} from '@/lib/billing/enforcement'
import {
  hasPaidAccess,
  hasFirstMarkPremium,
  hasFullMarksRewrite,
  hasPriorityMarking,
} from '@/lib/billing/features'
import { isFirstEverMark } from '@/lib/marking/first-mark'
import {
  RateLimitUnavailableError,
  clientIp,
  clientScopeKey,
  consumeAnonymousMarkSlot,
  refundAnonymousMarkSlot,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'
import {
  checkUploadFile,
  pageCountError,
  UPLOAD_SNIFF_BYTES,
  withUploadType,
} from '@/lib/http/upload-limits'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'
import { withRequestDeadline } from '@/lib/ai/request-deadline'
import { generateFullMarksRewrite } from '@/lib/marking/full-marks-rewrite'
import type { FullMarksRewritePlan } from '@/lib/marking/mark-runner'
import {
  openMarkRun,
  isMissingOptionalColumnError,
  MarkRunDuplicateKeyError,
  noteMarkRunStage,
  noteMarkRunPageCount,
  noteMarkRunVerify,
  noteMarkRunDisconnect,
  readMarkRunPrediction,
  settleMarkRunSuccess,
  settleMarkRunError,
  type MarkRunHandle,
} from '@/lib/marking/mark-run-log'
import { isUniqueViolation } from '@/lib/marking/mark-run-errors'
import { namedSubjectOrNull } from '@/lib/marking/subject-name'
import { resolveMarkRunExamSystem } from '@/lib/marking/resolve-exam-system'
import { notifyMarkFailed, notifyMarkReady } from '@/lib/marking/notify-mark-ready'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { onAttemptsMarked, validateAssignmentItemForStudent } from '@/lib/teacher/assignments'
import {
  ASSIGNMENT_ITEM_FIELD,
  markAssignmentLink,
  uncheckedAssignmentLink,
  parseAssignmentItemId,
  planSingleQuestionLink,
  type MarkAssignmentLink,
} from '@/lib/teacher/assignments/link'

// Multi-question scanned scripts (derive → mark → verify per question) have
// been measured at up to ~480s (`attempts.time_spent_seconds`); give generous
// headroom. NOTE: vercel.json's functions config for this route overrides this
// export in production, so keep the two in sync. 800s requires Fluid Compute
// (Pro/Enterprise); Vercel clamps to the plan max.
export const maxDuration = 800

/**
 * Wall-clock budget for one marking request, used to stop Gemini retries before
 * the platform kills the function.
 *
 * Derived from `maxDuration`, NOT from a guess about the plan ceiling. An
 * earlier version assumed Vercel was clamping this route to 300s and budgeted
 * 280s — but `attempts.time_spent_seconds` shows 6 marks that completed at up
 * to 479s, so the 800s really is in force and a 280s budget would have aborted
 * runs that currently succeed.
 *
 * Erring high is safe (the guard simply doesn't fire, leaving today's
 * behaviour); erring low actively kills working marks. The reserve is what the
 * handler needs to release its reservation, settle telemetry and emit an error.
 */
const MARK_BUDGET_RESERVE_MS = 20_000
const MARK_REQUEST_BUDGET_MS = (() => {
  const raw = Number(process.env.MARK_REQUEST_BUDGET_MS)
  if (Number.isFinite(raw) && raw > 10_000) return Math.floor(raw)
  return maxDuration * 1000 - MARK_BUDGET_RESERVE_MS
})()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const clientError = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 })

/** A set link the student may not use: 400 before anything is spent. */
const assignmentLinkError = (message: string) =>
  NextResponse.json(
    { error: message, field: ASSIGNMENT_ITEM_FIELD, code: 'assignment_item_invalid' },
    { status: 400 }
  )

/**
 * Hand a finished mark in against the student's sets (lib/teacher/assignments
 * onAttemptsMarked): the item it was stamped with, and any set in their classes
 * holding the same banked question.
 *
 * Deliberately AFTER the result and outside its fate, like the ready email: the
 * score is what the student is waiting for, and nothing on the teacher's side
 * may be able to fail a mark that is saved and charged. Handed to after() so it
 * does not hold the response; inline only where there is no request scope. The
 * hook itself never throws, and whatever it misses the set's next reconcile
 * picks up.
 */
async function scheduleAssignmentHandIn(userId: string | null, payload: unknown): Promise<void> {
  try {
    if (!userId || !isTeacherV2()) return
    const p = payload as { attempt_id?: unknown; question_attempt_ids?: unknown }
    const attemptIds = [
      p?.attempt_id,
      ...(Array.isArray(p?.question_attempt_ids) ? p.question_attempt_ids : []),
    ].filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (attemptIds.length === 0) return
    const task = () => onAttemptsMarked(supabaseAdmin, { userId, attemptIds })
    try {
      after(task)
    } catch {
      await task()
    }
  } catch (err) {
    console.error('[mark/process] assignment hand-in scheduling failed (mark kept)', err)
  }
}

function logMarkFailure(err: unknown, classified: ClassifiedMarkingError) {
  console.error('[mark/process] failed', {
    backend: geminiBackendLabel(),
    code: classified.code,
    status: classified.status,
    retries: getGeminiRetryStats(),
    detail: err instanceof Error ? err.message.slice(0, 600) : String(err),
  })
}

/**
 * Questions the pipeline cut from a multi-question script because the
 * allowance could not cover them (see splitQuestionBudget). Reported to the
 * student on `_allowance.questions_not_marked`; nothing was spent on them.
 */
function questionsOverAllowance(payload: unknown): number {
  const n = (payload as { questions_over_allowance?: unknown })?.questions_over_allowance
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * Attempt ids of the questions AFTER the first on a multi-question script.
 * The first is settled by the up-front reservation; each of these is one
 * extra mark.
 */
function extraQuestionAttemptIds(payload: unknown): string[] {
  const p = payload as {
    multi_question?: boolean
    question_attempt_ids?: unknown
  }
  if (!p?.multi_question || !Array.isArray(p.question_attempt_ids)) return []
  return (p.question_attempt_ids as unknown[])
    .filter((x): x is string => typeof x === 'string')
    .slice(1)
}

/**
 * Generate the premium full-marks rewrite AFTER the marks have been streamed,
 * persist it onto the attempt, and push it to the open stream.
 *
 * Running this inline used to add 15–30s to every paid mark — the one group
 * that should wait least waited most. Nothing in the score depends on it, so a
 * failure here is silent by design: the user simply doesn't get the extra panel.
 */
async function streamDeferredRewrite(
  plan: FullMarksRewritePlan,
  attemptId: string | null,
  send: (data: unknown) => void
): Promise<void> {
  try {
    const rewrite = await generateFullMarksRewrite(plan)
    if (!rewrite) return

    if (attemptId) {
      const { data: row } = await supabaseAdmin
        .from('attempts')
        .select('ai_marking')
        .eq('id', attemptId)
        .single()
      const aiMarking = (row?.ai_marking ?? {}) as Record<string, unknown>
      await supabaseAdmin
        .from('attempts')
        .update({ ai_marking: { ...aiMarking, full_marks_rewrite: rewrite } })
        .eq('id', attemptId)
    }

    // attempt_id lets the client confirm the rewrite belongs to the result it
    // is currently showing. A slow rewrite can outlive the mark it came from.
    send({ type: 'rewrite', rewrite, attempt_id: attemptId })
  } catch (err) {
    console.warn('[mark/process] deferred rewrite failed (result already sent)', err)
  }
}

/**
 * Close the SSE stream without caring whether the client is still there.
 *
 * Closing a controller the browser has already cancelled throws, and now that a
 * disconnect no longer aborts the run, that throw lands *after* the mark has
 * succeeded — turning a completed, charged, emailed mark into an unhandled
 * error inside the stream. There is nothing to report: the reader is gone.
 */
function closeStream(controller: ReadableStreamDefaultController): void {
  try {
    controller.close()
  } catch {
    /* already closed by the client */
  }
}

/**
 * Move the wait-time prediction from the run onto the finished attempt.
 *
 * Returns it too, so the reveal can show the gap without a second round trip.
 * Best-effort throughout: this is a teaching flourish on top of a mark that has
 * already been paid for and produced.
 */
async function settlePrediction(
  markRun: MarkRunHandle | null,
  attemptId: string | null
): Promise<number | null> {
  const predicted = await readMarkRunPrediction(markRun)
  if (predicted == null || !attemptId) return predicted
  try {
    await supabaseAdmin
      .from('attempts')
      .update({ predicted_marks: predicted })
      .eq('id', attemptId)
  } catch (err) {
    console.warn('[mark/process] prediction copy failed', err)
  }
  return predicted
}

/**
 * Bring a run row whose earlier attempt ended in error/abandoned back to
 * 'running' for a retry that carries the same client_request_id.
 *
 * Before the idempotency key was scoped, this retry inserted a second row
 * with the same key, hit the global unique index inside openMarkRun, and ran
 * with no telemetry at all. Reusing the row keeps one run per key and keeps
 * the retry visible to the sweep and to run-status.
 */
async function reuseMarkRun(
  runId: string,
  shape: {
    userId: string | null
    markIntent: MarkIntent
    pageCount: number
    hasPdf: boolean
    isPaid: boolean
    subjectCode: string | null
    examSystem: string | null
    reservationEventId: string | null
  }
): Promise<MarkRunHandle> {
  const now = Date.now()
  const handle: MarkRunHandle = {
    id: runId,
    startedAt: now,
    retriesAtStart: getGeminiRetryStats().totalRetries,
    lastStage: null,
    stageStartedAt: now,
    stageMs: {},
    clientDisconnected: false,
  }
  const base = {
    status: 'running' as const,
    user_id: shape.userId,
    upload_mode: 'single_question',
    mark_intent: shape.markIntent,
    page_count: shape.pageCount,
    has_pdf: shape.hasPdf,
    is_paid: shape.isPaid,
    subject_code: shape.subjectCode,
    attempt_id: null,
    error_code: null,
    error_message: null,
    last_stage: null,
    duration_ms: null,
    gemini_retries: null,
    started_at: new Date(now).toISOString(),
    finished_at: null,
  }
  try {
    let result = await supabaseAdmin
      .from('mark_runs')
      .update({
        ...base,
        exam_system: shape.examSystem,
        reservation_event_id: shape.reservationEventId,
      })
      .eq('id', runId)
    // The error OBJECT, not its message: the classifier needs the SQLSTATE to
    // tell a missing column from anything else that mentions a column name
    // (the scoped unique index is named after one). Same ordering as
    // openMarkRun — a unique violation is never treated as a migration gap.
    if (
      result.error &&
      !isUniqueViolation(result.error) &&
      isMissingOptionalColumnError(result.error)
    ) {
      result = await supabaseAdmin.from('mark_runs').update(base).eq('id', runId)
    }
    if (result.error) throw result.error
  } catch (err) {
    // Same contract as openMarkRun: telemetry must not be able to fail a mark.
    console.warn('[mark/process] run reuse failed (marking continues)', err)
    handle.id = null
  }
  return handle
}

export async function POST(request: NextRequest) {
  // Everything below runs inside a wall-clock budget so retry loops fail here,
  // in a handler that can release the reservation, settle telemetry and send a
  // real error event — instead of being killed mid-stream with no trace.
  return withRequestDeadline(MARK_REQUEST_BUDGET_MS, () => handleMarkRequest(request))
}

async function handleMarkRequest(request: NextRequest) {
  const startTime = Date.now()
  // Reservation lives at function scope so the outer catch can release it.
  let reservation: MarkReservation | null = null
  let reservationSettled = false // flips once on finalize OR release → exactly-once
  // Telemetry row, opened once the request shape is known. Function scope so the
  // outer catch can settle it; a run left unsettled is swept to 'abandoned'.
  let markRun: MarkRunHandle | null = null
  // Mirrors `reservationSettled`. Without it, work that runs AFTER
  // settleMarkRunSuccess (extra-mark billing, payload signing, and especially
  // controller.enqueue — which throws when the client has disconnected) falls
  // into the catch and flips a genuinely successful, already-charged run to
  // 'error', biasing the very success-rate metric this table exists to measure.
  let markRunSettled = false
  // The guest's one-a-day slot, taken BEFORE the first model call and given
  // back if the run fails. Function scope for the same reason as the
  // reservation: the outer catch must be able to refund it.
  let guestSlotHeld = false
  let ip = 'unknown'
  let userId: string | null = null

  const settleRunSuccess = async (attemptId: string | null) => {
    if (markRunSettled) return
    markRunSettled = true
    await settleMarkRunSuccess(markRun, attemptId)
  }
  const settleRunError = async (code: MarkingErrorCode, message: string) => {
    if (markRunSettled) return
    markRunSettled = true
    await settleMarkRunError(markRun, code, message)
  }
  /**
   * Refund the guest slot exactly once — for OUR failures only.
   *
   * Every failure used to refund, a bad photo and a Gemini outage alike, on
   * the reasoning that a run with no mark spent nothing worth charging for.
   * It had: by the time a script is judged unreadable, up to twenty pages
   * of Flash OCR and a Pro escalation per illegible-looking page are gone.
   * Handing the slot back made blank uploads free forever from one IP —
   * the 1/day cap bounded only the SUCCESS path (review §1.7 reopened).
   * Now a failure the upload decided (isUploadDecidedFailure) keeps the
   * slot; a timeout, overload, parse failure or billing/limiter outage on
   * our side still gives it back, so our outage never costs a guest their
   * mark of the day.
   */
  const refundGuestSlot = async () => {
    if (!guestSlotHeld) return
    guestSlotHeld = false
    await refundAnonymousMarkSlot(supabaseAdmin, ip, userId)
  }
  const refundGuestSlotUnlessUploadFault = async (code: MarkingErrorCode) => {
    if (isUploadDecidedFailure(code)) {
      guestSlotHeld = false // spent, deliberately
      return
    }
    await refundGuestSlot()
  }

  try {
    // Read auth from request.cookies (+ bearer) — cookies() from next/headers
    // can come back empty on this streaming multipart POST, which was silently
    // saving logged-in users' attempts with user_id = null (no progress).
    const { user } = await authenticateRouteRequest(request)
    userId = user?.id || null
    warnIfAuthDropped(request, userId, 'mark/process')

    ip = clientIp(request)

    // Signed-in users rely on subscription quotas; guests use the IP cap
    // (consumed below, once the upload has been validated). These helpers
    // settle the reservation exactly once: whichever of finalize/release runs
    // first wins.
    const finalizeReservation = async (attemptId: string | null) => {
      if (userId && reservation && !reservationSettled) {
        reservationSettled = true
        await finalizeMarkReservation(userId, reservation, attemptId, 'mark_single')
      }
    }
    const releaseReservation = async () => {
      if (reservation && !reservationSettled) {
        reservationSettled = true
        await releaseMarkReservation(reservation)
      }
    }

    /**
     * A scanned script can hold several questions marked separately. The
     * upfront reservation + finalize covers the first question; this charges
     * one extra mark per additional question so an N-question upload counts
     * as N marks. The question count is only known once the pipeline has
     * split the script, which is why it cannot be reserved at the gate.
     *
     * Two rules, both learned the hard way:
     *
     * 1. It can never fail the mark. It used to sit unguarded between settle
     *    and send: if recordExtraMarkUsages threw, the catch could not release
     *    (already settled) and emitted `error`, so the student saw a failure
     *    for a mark that was finished, charged and saved. Every outcome here,
     *    including a thrown one, is a number.
     *
     * 2. It runs BEFORE the result goes out, so the `_allowance` block can
     *    carry what was actually charged. recordExtraMarkUsages is cap-aware
     *    now — in 'enforce' mode it refuses extras beyond the cap — and the
     *    client tells the student when the script was bigger than what they
     *    had left. That is a handful of RPC round-trips on the tail of a
     *    multi-minute mark; a chip that lies costs more.
     */
    const recordExtraMarks = async (
      payload: unknown
    ): Promise<{ recorded: number; refused: number }> => {
      if (!userId || !reservation) return { recorded: 0, refused: 0 }
      const extras = extraQuestionAttemptIds(payload)
      if (extras.length === 0) return { recorded: 0, refused: 0 }
      try {
        const recorded = await recordExtraMarkUsages(userId, 'mark_single', reservation, extras)
        return { recorded, refused: Math.max(0, extras.length - recorded) }
      } catch (err) {
        console.error('[mark/process] extra mark usage failed (mark kept)', err)
        // Unmetered rather than refused: the work is done and the student has
        // the mark; the chip should not claim a charge that was never written.
        return { recorded: 0, refused: 0 }
      }
    }

    const formData = await request.formData()
    const pageFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('pages') && value instanceof File && value.size > 0) {
        pageFiles.push(value)
      }
    }
    const answerPhoto = formData.get('photo') as File | null
    if (pageFiles.length === 0 && answerPhoto?.size) {
      pageFiles.push(answerPhoto)
    }
    const answerPdfRaw = formData.get('answer_pdf') as File | null
    // The answer typed instead of photographed.
    const answerTextInput = (formData.get('answer_text') as string | null) ?? null
    const questionPhotoRaw = formData.get('question_photo') as File | null
    // `let`: a teacher's prompt replaces these below (see the set link).
    let questionTextInput = formData.get('question_text') as string | null
    const manualPaperCode = formData.get('manual_paper_code') as string | null
    const manualPaperSession = formData.get('manual_paper_session') as string | null
    const manualQuestionNumber = formData.get('manual_question_number') as string | null
    // Optional client idempotency key: 8-64 url-safe chars.
    const clientRequestIdRaw = (formData.get('client_request_id') as string | null)?.trim()
    const clientRequestId =
      clientRequestIdRaw && /^[A-Za-z0-9_-]{8,64}$/.test(clientRequestIdRaw)
        ? clientRequestIdRaw
        : null
    const uploadModeRaw = formData.get('upload_mode') as string | null
    // Whole-paper marking lives in /api/mark/whole-paper/{init,run}. The branch
    // that used to handle it here was unreachable from the UI but live for
    // direct callers: it segmented and marked up to 15 questions sequentially,
    // with verify, against ONE reservation — guests included. (Code review
    // 2026-09-25, §1.7.) Refused before anything is consumed.
    if (uploadModeRaw === 'whole_paper') {
      return NextResponse.json(
        {
          error:
            'Whole-paper marking has moved: POST the pages to /api/mark/whole-paper/init, then /api/mark/whole-paper/run. This endpoint marks one question.',
          code: 'use_whole_paper_init',
        },
        { status: 400 }
      )
    }
    const markIntentRaw = formData.get('mark_intent') as string | null
    let markIntent: MarkIntent =
      markIntentRaw === 'practice_question'
        ? 'practice_question'
        : markIntentRaw === 'combined_script'
          ? 'combined_script'
          : 'past_paper'
    let practiceSubjectCode = (
      formData.get('practice_subject_code') as string | null
    )?.trim() || null
    // Subject the user selected in the UI, sent even when they skip the full
    // paper selection. Used only as a tagging fallback so freeform marks still
    // resolve a subject (feeds mastery/review); never overrides paper detection.
    const selectedSubjectHint = (
      formData.get('subject_code') as string | null
    )?.trim() || null
    // M1: optional IB selection axes. Absent for all current traffic (inert).
    let ibComponentKey = (
      formData.get('ib_component_key') as string | null
    )?.trim() || null
    const ibLevel = (formData.get('ib_level') as string | null)?.trim() || null
    const ibMarksRaw = (formData.get('ib_marks_available') as string | null)?.trim()
    const ibMarksAvailable =
      ibMarksRaw && Number.isFinite(Number(ibMarksRaw)) && Number(ibMarksRaw) > 0
        ? Math.round(Number(ibMarksRaw))
        : null
    // General per-question total, sent by the upload form's "Total marks" field
    // for any single-question mark (not just IB points questions).
    const totalMarksRaw = (
      formData.get('total_marks_available') as string | null
    )?.trim()
    let totalMarksAvailable =
      totalMarksRaw &&
      Number.isFinite(Number(totalMarksRaw)) &&
      Number(totalMarksRaw) > 0
        ? Math.round(Number(totalMarksRaw))
        : null
    // Escape hatch: student says the marks are printed in the question — pipeline
    // extracts after OCR/text resolve and rejects if nothing is stated.
    const marksInQuestion =
      formData.get('marks_in_question') === '1' ||
      formData.get('marks_in_question') === 'true'
    const manualSubjectCode = manualPaperCode?.split('/')[0]
    const streamRequested = formData.get('stream') === '1'
    // The teacher's set item this upload is for, when /mark was opened from
    // a set (studentMarkHref). Ignored entirely with TEACHER_V2=0.
    const assignmentItemRaw = isTeacherV2()
      ? (formData.get(ASSIGNMENT_ITEM_FIELD) as string | null)?.trim() || null
      : null

    const hasTypedAnswer = !!answerTextInput?.trim()

    if (pageFiles.length === 0 && !answerPdfRaw?.size && !hasTypedAnswer) {
      return clientError('Add your answer — type it or upload a page.')
    }

    // ---- Upload validation: count, size, and what the bytes actually are ----
    //
    // All 400s, all before the guest slot, the reservation or the run row
    // exist, so a rejected upload costs nothing and leaves nothing to sweep.
    // The type each file is carried forward as is the SNIFFED one: the
    // client's `file.type` used to go straight into Gemini and into storage
    // as the object's content type.
    const pageCountProblem = pageCountError(pageFiles.length)
    if (pageCountProblem) return clientError(pageCountProblem)

    const readHead = async (file: File) =>
      new Uint8Array(await file.slice(0, UPLOAD_SNIFF_BYTES).arrayBuffer())

    for (let i = 0; i < pageFiles.length; i++) {
      const file = pageFiles[i]
      const check = checkUploadFile({
        label: pageFiles.length === 1 ? 'Your photo' : `Page ${i + 1}`,
        declaredType: file.type,
        size: file.size,
        head: await readHead(file),
        expect: 'image',
      })
      if (!check.ok) return clientError(check.message)
      pageFiles[i] = withUploadType(file, check.type)
    }

    let answerPdf: File | null = null
    if (answerPdfRaw?.size) {
      const check = checkUploadFile({
        label: 'The answer PDF',
        declaredType: answerPdfRaw.type,
        size: answerPdfRaw.size,
        head: await readHead(answerPdfRaw),
        expect: 'pdf',
      })
      if (!check.ok) return clientError(check.message)
      // Page count is capped downstream by the splitter (MAX_PDF_PAGES).
      answerPdf = withUploadType(answerPdfRaw, check.type)
    }

    let questionPhoto: File | null = null
    if (questionPhotoRaw?.size) {
      const check = checkUploadFile({
        label: 'The question photo',
        declaredType: questionPhotoRaw.type,
        size: questionPhotoRaw.size,
        head: await readHead(questionPhotoRaw),
        expect: 'image',
      })
      if (!check.ok) return clientError(check.message)
      questionPhoto = withUploadType(questionPhotoRaw, check.type)
    }

    // ---- Idempotency: a retry must find its original run, not start another --
    //
    // The client loses the connection before the run id arrives and uploads
    // again with the same client_request_id. Scoped to the caller: keys are
    // unique per user (or per hashed IP for a guest), so nobody can collide
    // with — or be told the run id of — anyone else's key.
    const clientScope = clientRequestId ? clientScopeKey(userId, ip) : null
    let reusableRunId: string | null = null
    if (clientRequestId && clientScope) {
      const { data: existingRun, error: lookupError } = await supabaseAdmin
        .from('mark_runs')
        .select('id, status')
        .eq('client_scope', clientScope)
        .eq('client_request_id', clientRequestId)
        .maybeSingle()
      if (lookupError) {
        // Most likely the client_scope migration is not applied here yet.
        // Dedupe is then unavailable, which is today's behaviour, not a
        // reason to refuse the mark.
        console.warn('[mark/process] idempotency lookup failed', lookupError.message)
      } else if (
        existingRun &&
        (existingRun.status === 'running' || existingRun.status === 'success')
      ) {
        return NextResponse.json({
          duplicate: true,
          mark_run_id: existingRun.id,
          status: existingRun.status,
        })
      } else if (existingRun) {
        // error / abandoned: the earlier attempt produced nothing. Run again
        // on the same row rather than tripping the unique index.
        reusableRunId = existingRun.id
      }
    }

    // ---- Teacher's set: checked before anything is spent ----------------------
    //
    // An item the student may not hand in against (not their class, not
    // published, deleted, closed to late work) is a 400 with nothing
    // consumed. A valid one is stamped on the attempt only when THIS upload is
    // that item (planSingleQuestionLink): the item id rides in the URL for as
    // long as the tab is open, and a student marking a different question from
    // it gets an ordinary mark, told it was not added to the set. A prompt is
    // always the teacher's prompt, so its text, subject and total replace the
    // form's before the run is opened.
    //
    // Nothing on the teacher side may fail a mark (the post-mark hook's rule
    // too): when the set cannot be checked at all — a database error — the
    // mark goes ahead unlinked and says so, and reconciliation on the banked
    // question can still count it later. Only a definite "no" is a 400.
    let assignmentLink: MarkAssignmentLink | null = null
    let linkedItemId: string | null = null
    if (assignmentItemRaw) {
      const itemId = parseAssignmentItemId(assignmentItemRaw)
      if (!itemId) {
        return assignmentLinkError(
          'That link to your teacher’s set is not valid. Open it again from your assignments.'
        )
      }
      if (!userId) return assignmentLinkError('Sign in to hand work in for your class.')
      let check: Awaited<ReturnType<typeof validateAssignmentItemForStudent>> | null = null
      try {
        check = await validateAssignmentItemForStudent(supabaseAdmin, itemId, userId)
      } catch (err) {
        console.error('[mark/process] could not check the set item; marking unlinked', {
          itemId,
          error: err instanceof Error ? err.message : String(err),
        })
        assignmentLink = uncheckedAssignmentLink(itemId)
      }
      if (check && !check.ok) return assignmentLinkError(check.reason)
      if (check?.ok) {
        const plan = planSingleQuestionLink(check.item, check.assignment, {
          markIntent,
          manualPaperCode,
          manualPaperSession,
          manualQuestionNumber,
          practiceSubjectCode,
          ibComponentKey,
          // What the pipeline would use as the total once on the practice path.
          questionMarks: ibMarksAvailable ?? totalMarksAvailable,
        })
        assignmentLink = markAssignmentLink(check.assignment, itemId, plan)
        if (plan.linked) {
          linkedItemId = itemId
          const o = plan.overrides
          if (o.markIntent) markIntent = o.markIntent
          if (o.questionText !== undefined) questionTextInput = o.questionText
          if (o.practiceSubjectCode) practiceSubjectCode = o.practiceSubjectCode
          if (o.ibComponentKey !== undefined) ibComponentKey = o.ibComponentKey
          if (o.questionMarks != null && ibMarksAvailable == null && totalMarksAvailable == null) {
            totalMarksAvailable = o.questionMarks
          }
        }
      }
    }

    // ---- Guest slot: consumed HERE, before any model call -------------------
    //
    // Used to be checked here and incremented after the pipeline finished,
    // minutes later — so N parallel guest uploads from one IP all passed and
    // all ran. The RPC increments-or-refuses in one statement; the slot goes
    // back on OUR failures below (refundGuestSlotUnlessUploadFault) and is
    // kept when the upload itself was the problem.
    const slot = await consumeAnonymousMarkSlot(supabaseAdmin, ip, userId)
    if (!slot.allowed) {
      return rateLimitJson(slot.message)
    }
    guestSlotHeld = !userId

    if (userId) {
      reservation = await reserveMarkUsage(userId, 'mark_single')
      if (reservation.blocked_by_mode) {
        return NextResponse.json(quotaExceededBody(reservation.allowance), { status: 402 })
      }
    }
    // How many questions of a scanned script the allowance can cover. The
    // pipeline cuts the split to this BEFORE marking; the ledger-side refusal
    // in recordExtraMarkUsages stays as a backstop for a concurrent upload
    // in the same window. Null for guests and in warn/off mode.
    const maxQuestions = reservation ? maxQuestionsForReservation(reservation) : null

    // Premium marking depth keys off paid entitlement. Guests (no reservation)
    // are free. `isPaid` drives the verify pass on the full multi-question
    // script; `enableRewrite` gates the full-marks rewrite (separate predicate so
    // it can be re-tiered independently).
    //
    // The allowance's resolved `access`, never `{tier, status}` recomputed
    // here: the recompute dropped verified teacher seats and comps, so a
    // teacher on a Scholar allowance was marked at free depth (review §2).
    const markAccess = reservation ? reservation.allowance.access : 'free'
    const isPaid = hasPaidAccess(markAccess)

    // The one mark that is premium without being paid for. A signed-in student
    // who has never marked anything gets the verify pass and the rewrite on
    // this run only, so the paid product is experienced once instead of being
    // described. See hasFirstMarkPremium for why this replaced the trial.
    const firstMarkPremium = hasFirstMarkPremium({
      access: markAccess,
      signedIn: !!userId,
      isFirstEverMark: userId
        ? await isFirstEverMark(supabaseAdmin, userId)
        : false,
    })

    // Depth of marking vs. who paid. `isPaid` stays the billing truth — it is
    // what mark_runs records and what the allowance was charged against — while
    // `deepMarking` is what the pipeline acts on. Conflating them would log a
    // free student's first mark as a paid run and quietly corrupt the only
    // table that answers "does paid marking actually differ".
    const deepMarking = isPaid || firstMarkPremium
    const enableRewrite = hasFullMarksRewrite(markAccess) || firstMarkPremium
    const priorityDeepMarking = hasPriorityMarking(markAccess)

    // Open the reliability row before the first model call, so a run that dies
    // mid-pipeline still leaves evidence behind.
    const subjectCodeForRun =
      practiceSubjectCode ?? selectedSubjectHint ?? manualSubjectCode ?? null
    const examSystemExplicit =
      (formData.get('exam_system') as string | null)?.trim() || null
    const examSystemForRun = resolveMarkRunExamSystem({
      explicit: examSystemExplicit,
      subjectCode: subjectCodeForRun,
    })
    const runShape = {
      userId,
      markIntent,
      pageCount: pageFiles.length,
      hasPdf: !!answerPdf,
      isPaid,
      subjectCode: subjectCodeForRun,
      examSystem: examSystemForRun,
      reservationEventId: reservation?.event_id ?? null,
    }
    if (reusableRunId) {
      markRun = await reuseMarkRun(reusableRunId, runShape)
    } else {
      try {
        // The scope travels with the insert, so the unique index on
        // (client_scope, client_request_id) settles a same-second race at the
        // row itself; the loser gets the duplicate error below.
        markRun = await openMarkRun({
          ...runShape,
          uploadMode: 'single_question',
          clientRequestId,
          clientScope,
        })
      } catch (err) {
        if (!(err instanceof MarkRunDuplicateKeyError) || !clientRequestId) throw err
        // Two uploads with one key inside the same second, and this one is
        // the loser: give back what it holds and point at the winner.
        await releaseReservation()
        await refundGuestSlot()
        let winnerQuery = supabaseAdmin
          .from('mark_runs')
          .select('id, status')
          .eq('client_request_id', clientRequestId)
        if (clientScope) winnerQuery = winnerQuery.eq('client_scope', clientScope)
        const { data: winner } = await winnerQuery.maybeSingle()
        return NextResponse.json({
          duplicate: true,
          mark_run_id: winner?.id ?? null,
          status: winner?.status ?? 'running',
        })
      }
    }

    const pipelineInput = {
      pageFiles,
      answerPdf,
      answerText: answerTextInput,
      questionPhoto,
      questionTextInput: questionTextInput?.trim() || '',
      manualPaperCode:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? null
          : manualPaperCode,
      manualPaperSession:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? null
          : manualPaperSession,
      manualQuestionNumber:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? null
          : manualQuestionNumber,
      markIntent,
      practiceSubjectCode:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? practiceSubjectCode
          : null,
      fallbackSubjectCode: selectedSubjectHint,
      ibComponentKey:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? ibComponentKey
          : null,
      ibLevel:
        markIntent === 'practice_question' || markIntent === 'combined_script'
          ? ibLevel
          : null,
      questionMarks:
        (markIntent === 'practice_question' ||
        markIntent === 'combined_script'
          ? ibMarksAvailable
          : null) ?? totalMarksAvailable,
      marksInQuestion,
      userId,
      // Depth, not entitlement — a first mark is deep without being paid.
      isPaid: deepMarking,
      enableRewrite,
      priorityDeepMarking,
      maxQuestions,
      // Stamped on the attempt row(s); null unless this upload is the set's item.
      assignmentItemId: linkedItemId,
      startedAt: startTime,
    }

    if (streamRequested) {
      const encoder = new TextEncoder()
      /**
       * Whether the student is still on the page.
       *
       * This used to be fatal rather than merely known: `send` threw the
       * moment the tab closed, the throw unwound the pipeline, and a mark
       * that was already paid for and two thirds finished was thrown away —
       * which is why the page had to nail the student down with a
       * beforeunload warning for three minutes. Now the run finishes without
       * them and the result is emailed.
       */
      let clientGone = false
      const markLeft = () => {
        if (clientGone) return
        clientGone = true
        noteMarkRunDisconnect(markRun)
      }
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => {
            if (clientGone) return
            try {
              controller.enqueue(encoder.encode(formatSseEvent(data)))
            } catch {
              // Backstop for a disconnect `cancel` did not report.
              markLeft()
            }
          }
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'))
            } catch {
              clearInterval(heartbeat)
              markLeft()
            }
          }, 12_000)
          try {
            // First thing on the wire: the run id, so the wait screen can
            // post back a predicted score before the result exists.
            send({ type: 'run', mark_run_id: markRun?.id ?? null })
            const payload = await runSingleQuestionMark({
              ...pipelineInput,
              deferRewrite: true,
              onProgress: (ev) => {
                if (ev.type === 'progress') noteMarkRunStage(markRun, ev.stage)
                if (ev.type === 'context' && typeof ev.pdf_pages === 'number') noteMarkRunPageCount(markRun, ev.pdf_pages)
                // The first-pass score, before the verify pass can overwrite
                // it. Recorded against the final mark so the two can be
                // compared rather than only the survivor being kept.
                if (ev.type === 'provisional_score') {
                  noteMarkRunVerify(markRun, { firstPass: ev.marks_earned })
                }
                send(ev)
              },
            })
            const attemptId = (payload as { attempt_id?: string })?.attempt_id ?? null
            await finalizeReservation(attemptId)
            noteMarkRunVerify(markRun, {
              final: (payload as { marks_earned?: number })?.marks_earned ?? null,
            })
            await settleRunSuccess(attemptId)
            // Extra-question usage rows, cap-aware and never able to fail the
            // mark; what was actually charged is what the chip shows.
            const extras = await recordExtraMarks(payload)
            const marksCharged = 1 + extras.recorded
            // Pull the deferred rewrite off the payload — it is server-only
            // scaffolding and must never reach the client as part of `result`.
            const { _rewrite_plan: rewritePlan, ...clientPayload } =
              payload as Record<string, unknown> & {
                _rewrite_plan?: FullMarksRewritePlan
              }
            send({
              type: 'result',
              payload: await signMarkPayloadForClient({
                ...clientPayload,
                _allowance: reservation
                  ? allowanceForResponse(reservation.allowance, marksCharged, {
                      marksRefused: extras.refused,
                      questionsNotMarked: questionsOverAllowance(payload),
                    })
                  : undefined,
                // Only set on the one run it was true for, so the result can
                // say what this mark got that the next one will not.
                _first_mark_premium: firstMarkPremium || undefined,
                // Where the mark went on the teacher's side, for /mark to say.
                _assignment: assignmentLink ?? undefined,
              }),
            })

            // Deliberately AFTER the result. The prediction lives on a row
            // this invocation never wrote, so reading it costs a round trip —
            // and putting a round trip in front of the score, in the middle of
            // work whose entire purpose is to reveal the score sooner, would
            // be self-defeating. The page shows the gap from what it captured
            // locally; this write is for the attempt page and the email.
            const predictedMarks = await settlePrediction(markRun, attemptId)

            // The teacher's side, after the result and never able to fail it.
            await scheduleAssignmentHandIn(userId, payload)

            // Nobody there to read it. The mark is saved and the attempt page
            // will show it in full — mail carries the score and the link.
            //
            // Handed to `after()` rather than awaited: the client has already
            // gone, so the platform is free to start tearing this invocation
            // down, and a bare await would race that teardown. This is the
            // one hop the notification cannot afford to lose.
            if (clientGone) {
              const done = payload as Record<string, unknown>
              const notice = {
                userId,
                attemptId: (done.attempt_id as string | null) ?? null,
                marksEarned: (done.marks_earned as number | null) ?? null,
                totalMarks: (done.total_marks as number | null) ?? null,
                subjectLabel: namedSubjectOrNull(
                  done.subject_code as string | null
                ),
                paperRef: (done.paper_code as string | null) ?? null,
                predictedMarks: predictedMarks,
              }
              try {
                after(() => notifyMarkReady(notice))
              } catch {
                // No request scope to defer to (tests, scripts): send inline.
                await notifyMarkReady(notice)
              }
            }

            // Premium full-marks rewrite, generated only now that the score is
            // on screen. Best-effort: any failure just means no rewrite panel.
            if (rewritePlan) {
              await streamDeferredRewrite(rewritePlan, attemptId, send)
            }
            closeStream(controller)
          } catch (err: unknown) {
            const classified = classifyMarkingError(err)
            await releaseReservation()
            await refundGuestSlotUnlessUploadFault(classified.code)
            await settleRunError(classified.code, classified.message)
            logMarkFailure(err, classified)
            send({
              type: 'error',
              error: classified.message,
              retryable: classified.retryable,
              status: classified.status,
            })
            // They were told they could leave, so the promise has to be kept
            // in both directions. Silence after "we'll email you" leaves them
            // waiting on mail that is never coming, and we never find out
            // because they never come back to see the error.
            if (clientGone) {
              // Only what the request itself told us — a failed run has no
              // detected paper or resolved subject to draw on.
              const failure = {
                userId,
                subjectLabel: namedSubjectOrNull(
                  pipelineInput.fallbackSubjectCode ?? manualSubjectCode ?? null
                ),
                paperRef: pipelineInput.manualPaperCode ?? null,
              }
              try {
                after(() => notifyMarkFailed(failure))
              } catch {
                await notifyMarkFailed(failure)
              }
            }
            closeStream(controller)
          } finally {
            clearInterval(heartbeat)
          }
        },
        /** The prompt disconnect signal — fires when the browser drops the
         * stream, well before an enqueue would throw. */
        cancel() {
          markLeft()
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    }

    try {
      // Stage tracking on the non-streaming path too, so its rows aren't
      // permanently last_stage = NULL.
      const payload = await runSingleQuestionMark({
        ...pipelineInput,
        onProgress: (ev) => {
          if (ev.type === 'progress') noteMarkRunStage(markRun, ev.stage)
          if (ev.type === 'context' && typeof ev.pdf_pages === 'number') noteMarkRunPageCount(markRun, ev.pdf_pages)
        },
      })
      const attemptId = (payload as { attempt_id?: string })?.attempt_id ?? null
      await finalizeReservation(attemptId)
      await settleRunSuccess(attemptId)
      const extras = await recordExtraMarks(payload)
      const marksCharged = 1 + extras.recorded
      // Runs after the response (after()); never able to fail the mark.
      await scheduleAssignmentHandIn(userId, payload)
      return NextResponse.json(
        await signMarkPayloadForClient({
          ...payload,
          _allowance: reservation
            ? allowanceForResponse(reservation.allowance, marksCharged, {
                marksRefused: extras.refused,
                questionsNotMarked: questionsOverAllowance(payload),
              })
            : undefined,
          _first_mark_premium: firstMarkPremium || undefined,
          _assignment: assignmentLink ?? undefined,
        })
      )
    } catch (err: unknown) {
      const classified = classifyMarkingError(err)
      await releaseReservation()
      await refundGuestSlotUnlessUploadFault(classified.code)
      await settleRunError(classified.code, classified.message)
      logMarkFailure(err, classified)
      if (isUploadDecidedFailure(classified.code)) {
        return clientError(classified.message)
      }
      return NextResponse.json(
        {
          error: classified.message,
          retryable: classified.retryable,
          code: classified.code,
        },
        { status: classified.status }
      )
    }
  } catch (err: unknown) {
    if (reservation && !reservationSettled) {
      reservationSettled = true
      await releaseMarkReservation(reservation)
    }
    if (err instanceof BillingUnavailableError) {
      // The gate failed closed: nothing was marked, nothing was charged, and
      // the body says to try again in a minute. Classifying it as a generic
      // marking error hid all three facts behind "Something went wrong".
      await refundGuestSlot()
      await settleRunError('unknown', err.message)
      console.error('[mark/process] billing unavailable (fail closed):', err.cause)
      return NextResponse.json(err.body, { status: err.status })
    }
    if (err instanceof RateLimitUnavailableError) {
      // The guest limiter could not be consulted (nothing was consumed, so
      // there is nothing to refund). A 503 with a retry, as the omni and
      // teach-back routes answer, rather than a generic 500 "Something went
      // wrong" that reads as a marking failure.
      console.error('[mark/process] guest rate limit unavailable:', err.message)
      return NextResponse.json(
        {
          error: 'Marking is briefly unavailable. Nothing was marked — please try again in a moment.',
          retryable: true,
          code: 'rate_limit_unavailable',
        },
        { status: 503, headers: { 'Retry-After': '30' } }
      )
    }
    const classified = classifyMarkingError(err)
    await refundGuestSlotUnlessUploadFault(classified.code)
    await settleRunError(classified.code, classified.message)
    logMarkFailure(err, classified)
    return NextResponse.json(
      {
        error: classified.message,
        retryable: classified.retryable,
        code: classified.code,
      },
      { status: classified.status }
    )
  }
}
