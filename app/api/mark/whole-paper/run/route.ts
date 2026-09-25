import { NextRequest, NextResponse } from 'next/server'
import {
  aggregateWholePaperResults,
  buildPreviewCutResult,
  estimateMarkingSeconds,
  type WholePaperAggregate,
} from '@/lib/marking/whole-paper'
import { fetchPaperQuestionMeta } from '@/lib/marking/paper-questions'
import {
  markWholePaperQuestionSafe,
  supabaseAdmin,
} from '@/lib/marking/mark-runner'
import {
  WHOLE_PAPER_CLAIM_STALE_MS,
  isWholePaperClaimStale,
  isWholePaperJob,
  type WholePaperJobState,
} from '@/lib/marking/whole-paper-shared'
import type { QuestionMarkResult } from '@/lib/marking/types'
import { pagesForQuestion } from '@/lib/marking/whole-paper-pages'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import {
  BillingUnavailableError,
  reserveMarkUsage,
  finalizeMarkReservation,
  releaseMarkReservation,
  computeAllowance,
  allowanceForResponse,
  quotaExceededBody,
  type MarkReservation,
} from '@/lib/billing/enforcement'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { hasPaidAccess, hasPriorityMarking } from '@/lib/billing/features'
import {
  isRequestDeadlineError,
  withRequestDeadline,
} from '@/lib/ai/request-deadline'
import {
  noteMarkRunStage,
  openMarkRun,
  settleMarkRunError,
  settleMarkRunSuccess,
  type MarkRunHandle,
} from '@/lib/marking/mark-run-log'
import {
  classifyMarkingError,
  type MarkingErrorCode,
} from '@/lib/marking/classify-marking-error'
import { resolveMarkRunExamSystem } from '@/lib/marking/resolve-exam-system'

// Marks up to 15 questions; give headroom like /mark/process. Kept in sync with
// vercel.json (which overrides this in production). 800s needs Fluid Compute.
export const maxDuration = 800

/**
 * Wall-clock budget, mirroring mark/process. The reserve is what the handler
 * needs to release its reservation and write a terminal job state; erring high
 * simply means the guard never fires, erring low kills working marks.
 */
const WHOLE_PAPER_BUDGET_RESERVE_MS = 20_000
const WHOLE_PAPER_BUDGET_MS = maxDuration * 1000 - WHOLE_PAPER_BUDGET_RESERVE_MS

async function updateJob(attemptId: string, state: WholePaperJobState) {
  await supabaseAdmin
    .from('attempts')
    .update({
      ai_marking: state,
      marks_earned: state.result?.marks_earned ?? 0,
      total_marks: state.result?.total_marks ?? 0,
    })
    .eq('id', attemptId)
}

const qKey = (q: string) => normalizeQuestionNumber(q)

/**
 * Everything runs inside a wall-clock budget so retry loops fail HERE, in a
 * handler that can release the reservation and settle the job — instead of
 * being killed mid-run with the attempt stuck in `marking` and the reservation
 * never released, waiting on the half-hourly mark-run-sweep to notice.
 *
 * mark/process has had this since it was written; whole-paper never did, and it
 * is the route with more nested retry loops beneath it: up to 15 questions, each
 * able to derive a scheme, mark, verify, escalate OCR and retry underneath that.
 */
export async function POST(request: NextRequest) {
  return withRequestDeadline(WHOLE_PAPER_BUDGET_MS, () => handleRun(request))
}

async function handleRun(request: NextRequest) {
  const startTime = Date.now()
  let attemptId: string | null = null
  let markUserId: string | null = null
  // The job as read at the start. The failure path MERGES into this: the old
  // catch replaced ai_marking with a bare {phase:'failed'}, dropping
  // paper_code, segmented_questions and pages_ocr — so the "retry to continue"
  // the client then offered could only ever get 400 "Job missing paper
  // context", after a guest had already spent the day's slot at init.
  let job: WholePaperJobState | null = null
  let reservation: MarkReservation | null = null
  let reservationSettled = false // flips once on finalize OR release → exactly-once
  // Telemetry row. Whole-paper never opened one, so a killed run was invisible
  // to the sweep, to run-status and to PendingMarkWatcher.
  let markRun: MarkRunHandle | null = null
  let markRunSettled = false
  // Marked so far, in segment order, so a failure keeps them for the retry.
  let results: QuestionMarkResult[] = []
  // Set once the finished paper is written. Anything that throws after that
  // (finalize, signing, allowance) must not overwrite a complete result with
  // 'failed' nor release the reservation for a mark the student now has.
  let completed = false
  let wholePaper: WholePaperAggregate | null = null

  const settleRunSuccess = async (id: string | null) => {
    if (markRunSettled) return
    markRunSettled = true
    await settleMarkRunSuccess(markRun, id)
  }
  const settleRunError = async (code: MarkingErrorCode, message: string) => {
    if (markRunSettled) return
    markRunSettled = true
    await settleMarkRunError(markRun, code, message)
  }
  const releaseReservation = async () => {
    if (!reservation || reservationSettled) return
    reservationSettled = true
    await releaseMarkReservation(reservation)
  }
  /** Terminal 'failed' state that keeps everything a retry needs. */
  const failedState = (message: string, error: string): WholePaperJobState => ({
    ...(job as WholePaperJobState),
    phase: 'failed',
    message,
    error,
    questions_completed: results.length,
    partial_questions: results.length ? results : job?.partial_questions,
    result: undefined,
  })

  try {
    const body = await request.json().catch(() => ({}))
    attemptId =
      (body.attempt_id as string) ||
      new URL(request.url).searchParams.get('attempt_id')

    if (!attemptId) {
      return NextResponse.json({ error: 'attempt_id required' }, { status: 400 })
    }

    const { supabase: supabaseAuth, user, pendingCookies } =
      await authenticateRouteRequest(request)

    const { data: attempt, error: fetchError } = await supabaseAdmin
      .from('attempts')
      .select('id, ai_marking, user_id, created_at')
      .eq('id', attemptId)
      .maybeSingle()

    if (fetchError || !attempt) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Ownership: a user-owned attempt may only be run by its owner (or a
    // teacher); guest jobs (user_id null) are gated by the unguessable UUID.
    if (attempt.user_id) {
      if (!user) {
        return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
          status: 401,
        })
      }
      if (attempt.user_id !== user.id) {
        const teacherCheck = await requireTeacher(supabaseAuth, user.id)
        if (!teacherCheck.ok) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        // Scope to the teacher's own classroom — see whole-paper/retry, which
        // documents why requireTeacher() alone is not enough (`role` is
        // self-assignable via the public onboarding action).
        //
        // This route is the worse of the two that were missing it: the run is
        // reserved against `attempt.user_id`, not the caller, and the claim
        // writes marks_earned: 0 before marking starts. So without this re-read
        // a self-declared teacher could burn a paying student's quota AND
        // overwrite their marks, using nothing but the attempt UUID.
        const { data: scoped } = await supabaseAuth
          .from('attempts')
          .select('id')
          .eq('id', attempt.id)
          .maybeSingle()
        if (!scoped) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const current = attempt.ai_marking
    if (!isWholePaperJob(current)) {
      return NextResponse.json({ error: 'Invalid job state' }, { status: 400 })
    }
    job = current

    if (job.phase === 'complete' && job.result) {
      return NextResponse.json({ status: 'complete', result: job.result })
    }

    // A fresh claim is a run in progress. A stale one is a killed function —
    // the claim below is allowed to take it over. A job with no claim stamp
    // (claimed by the pre-stamp deploy) is judged by its age from creation,
    // so a retry cannot start a second runner beside one still marking.
    if (
      job.phase === 'marking' &&
      !isWholePaperClaimStale(job, {
        createdAt: (attempt as { created_at?: string | null }).created_at ?? null,
      })
    ) {
      return NextResponse.json({ status: 'already_running' })
    }

    const paperCode = job.paper_code
    const paperSession = job.paper_session
    const segments = job.segmented_questions || []
    const pagesOcr = job.pages_ocr || []

    if (!paperCode || !paperSession || segments.length === 0) {
      return NextResponse.json({ error: 'Job missing paper context' }, { status: 400 })
    }

    // Resume rather than restart. A run that died or ran out of time left its
    // marked questions in partial_questions; marking them again would spend
    // the same budget on the same questions and — for a paper that hit the
    // deadline — hit it again in the same place on every retry.
    const byKey = new Map<string, QuestionMarkResult>()
    for (const prior of job.partial_questions ?? []) {
      if (prior.status === 'attempted') byKey.set(qKey(prior.question_number), prior)
    }
    const pending = segments.filter((seg) => !byKey.has(qKey(seg.question_number)))
    const orderedResults = () =>
      segments
        .map((seg) => byKey.get(qKey(seg.question_number)))
        .filter((r): r is QuestionMarkResult => !!r)
    results = orderedResults()

    const markingState: WholePaperJobState = {
      ...job,
      phase: 'marking',
      message: 'Marking your answers…',
      claimed_at: new Date().toISOString(),
      questions_completed: results.length,
      questions_total: segments.length,
      priority: job.priority ?? 'standard',
      partial_questions: results,
      error: undefined,
    }

    // Atomically claim the job: flip phase→'marking' unless another runner
    // holds a LIVE claim. Postgres serializes the row update, so of two
    // near-simultaneous POSTs exactly one matches the guard and proceeds; the
    // loser gets 0 rows and returns already_running. This closes the
    // read-then-write (TOCTOU) window that previously let a duplicate request
    // mark the paper — and reserve the quota — twice.
    //
    // The guard also admits a claim whose claimed_at is older than the stale
    // window: the route's maxDuration is 800s, so a 'marking' row older than
    // fifteen minutes is a function that was killed, and without this the job
    // stayed 'marking' for ever and every retry got already_running. A row
    // with no stamp at all (claimed by code that predates it) is admitted
    // only once the ATTEMPT is older than the window — the same rule
    // isWholePaperClaimStale applies — so a paper in flight at deploy time
    // cannot be taken over by a second runner two seconds later.
    const staleBefore = new Date(Date.now() - WHOLE_PAPER_CLAIM_STALE_MS).toISOString()
    const { data: claimed } = await supabaseAdmin
      .from('attempts')
      .update({ ai_marking: markingState, marks_earned: 0, total_marks: 0 })
      .eq('id', attemptId)
      .or(
        [
          'ai_marking->>phase.neq.marking',
          `and(ai_marking->>claimed_at.is.null,created_at.lt."${staleBefore}")`,
          `ai_marking->>claimed_at.lt."${staleBefore}"`,
        ].join(',')
      )
      .select('id')
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ status: 'already_running' })
    }

    // Whole paper = 1 mark. Reserve after winning the claim; finalize on
    // success, release on failure — same single-request pattern as /mark/process.
    markUserId = (attempt as { user_id?: string | null }).user_id ?? null
    if (markUserId) {
      try {
        reservation = await reserveMarkUsage(markUserId, 'mark_whole_paper')
      } catch (err) {
        if (!(err instanceof BillingUnavailableError)) throw err
        // The gate failed closed (nothing marked, nothing charged). Un-claim
        // so the paper is not wedged in 'marking' and the retry can run once
        // billing is back; the body says exactly that.
        await supabaseAdmin
          .from('attempts')
          .update({ ai_marking: job })
          .eq('id', attemptId)
        console.error('[whole-paper/run] billing unavailable (fail closed):', err.cause)
        return NextResponse.json(err.body, { status: err.status })
      }
      if (reservation.blocked_by_mode) {
        // Un-claim so a later retry isn't wedged in 'marking' with no runner.
        await supabaseAdmin
          .from('attempts')
          .update({ ai_marking: job })
          .eq('id', attemptId)
        return NextResponse.json(quotaExceededBody(reservation.allowance), { status: 402 })
      }
    }

    // The allowance's resolved `access` (seat- and comp-aware), never
    // `{tier, status}` recomputed here — see review §2: a verified teacher was
    // getting a Scholar allowance and free-tier marking depth in one request.
    const markAccess = reservation ? reservation.allowance.access : 'free'
    const isPaid = hasPaidAccess(markAccess)

    // Open the reliability row before the first model call, with the attempt
    // and the reservation it is holding, so a run that dies mid-paper is both
    // visible to the sweep and releasable by it.
    const subjectCode = paperCode.split('/')[0] || null
    markRun = await openMarkRun({
      userId: markUserId,
      uploadMode: 'whole_paper',
      markIntent: 'past_paper',
      pageCount: pagesOcr.length,
      hasPdf: !!job.has_pdf,
      isPaid,
      subjectCode,
      examSystem: resolveMarkRunExamSystem({ subjectCode }),
      attemptId,
      reservationEventId: reservation?.event_id ?? null,
    })
    noteMarkRunStage(markRun, 'marking')

    const paperQuestions = await fetchPaperQuestionMeta(paperCode, paperSession, {
      listSchemes: async (code, session) => {
        const { data } = await supabaseAdmin
          .from('mark_schemes')
          .select('question_number, total_marks')
          .eq('paper_code', code)
          .eq('paper_session', session)
        return data || []
      },
    })

    // Max priority deep marking: mark two questions at a time so whole papers
    // finish sooner while Pro/Scholar stay sequential (safer under load).
    const priorityDeep = hasPriorityMarking(markAccess)
    if (priorityDeep) markingState.priority = 'max'
    const batchSize = priorityDeep ? 2 : 1

    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize)
      const done = results.length
      const estRemaining = estimateMarkingSeconds(segments.length - done)

      await updateJob(attemptId, {
        ...markingState,
        phase: 'marking',
        message: priorityDeep
          ? `Max priority · marking questions ${done + 1}–${Math.min(done + batch.length, segments.length)} of ${segments.length}…`
          : `Marking question ${done + 1} of ${segments.length}…`,
        current_question: batch[0]?.question_number,
        questions_completed: done,
        questions_total: segments.length,
        estimated_seconds_remaining: estRemaining,
        partial_questions: results,
      })

      // A RequestDeadlineExceededError from any question rejects the batch and
      // lands in the catch below, which releases the reservation. The Safe
      // wrapper used to swallow it into marking_failed, so the paper was
      // finalized and charged with its tail "failed" in milliseconds.
      const batchResults = await Promise.all(
        batch.map(async (seg) => {
          const questionPages =
            seg.page_indices?.length && pagesOcr.length
              ? seg.page_indices
                  .map((idx) => pagesOcr[idx])
                  .filter((p): p is NonNullable<typeof p> => !!p)
              : pagesForQuestion(seg.question_number, pagesOcr)

          const qResult = await markWholePaperQuestionSafe({
            paperCode,
            paperSession,
            questionNumber: seg.question_number,
            answerText: seg.answer_text,
            questionPages,
          })
          return { seg, qResult: { ...qResult, answer_text: seg.answer_text } }
        })
      )

      for (const { seg, qResult } of batchResults) {
        byKey.set(qKey(seg.question_number), qResult)
        results = orderedResults()
        const tags =
          qResult.syllabus_tags ??
          qResult.ai_marking?.syllabus_tags ??
          []

        await updateJob(attemptId, {
          ...markingState,
          phase: 'marking',
          message: priorityDeep
            ? `Max priority · marked ${results.length} of ${segments.length}…`
            : `Marking question ${results.length} of ${segments.length}…`,
          current_question: seg.question_number,
          questions_completed: results.length,
          questions_total: segments.length,
          estimated_seconds_remaining: estimateMarkingSeconds(
            segments.length - results.length
          ),
          partial_questions: results,
          loading_context: {
            paper_code: paperCode,
            paper_session: paperSession,
            question_number: seg.question_number,
            syllabus_tags: tags.length ? tags : undefined,
          },
        })
      }
    }

    // Nothing marked at all is a failed run, not a paper scored 0/0. The
    // reservation goes back, the job is left retryable, and the reason is the
    // questions' own — when every one says "not in our bank", retrying will
    // not help and the message should say what will.
    if (results.length > 0 && results.every((r) => r.status === 'marking_failed')) {
      const messages = new Set(results.map((r) => r.error_message).filter(Boolean))
      const reason =
        messages.size === 1
          ? (results[0].error_message as string)
          : 'None of the questions in this paper could be marked. Please try again.'
      await releaseReservation()
      await settleRunError('unknown', reason)
      await updateJob(attemptId, failedState('Marking failed', reason))
      return NextResponse.json({ error: reason }, { status: 500 })
    }

    // Free preview: questions the student answered beyond the tier limit.
    // Numbers only were kept, so look up each bank total for the row.
    const totalFor = (qn: string) =>
      paperQuestions.find((p) => qKey(p.question_number) === qKey(qn))?.total_marks ?? 0
    const previewCut = (job.preview_cut_questions ?? []).map((qn) =>
      buildPreviewCutResult(qn, totalFor(qn))
    )

    wholePaper = aggregateWholePaperResults(
      paperCode,
      paperSession,
      [...results, ...previewCut],
      paperQuestions,
      { questionLimit: job.question_limit }
    )
    wholePaper.pages_ocr = pagesOcr

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - startTime) / 1000)
    )

    const finalState: WholePaperJobState = {
      phase: 'complete',
      message: 'Marking complete',
      questions_total: segments.length,
      questions_completed: segments.length,
      result: wholePaper,
      paper_code: paperCode,
      paper_session: paperSession,
      partial_questions: results,
      warnings: job.warnings,
    }

    const { error: finalWriteError } = await supabaseAdmin
      .from('attempts')
      .update({
        ai_marking: wholePaper,
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
        time_spent_seconds: timeSpentSeconds,
      })
      .eq('id', attemptId)
    if (finalWriteError) throw finalWriteError
    completed = true

    // Guests are charged at whole-paper/init, not here.
    //
    // This block used to increment the IP counter after the paper had already
    // been marked, and never blocked on it — while init checked the counter and
    // never incremented it. Charging on completion is the wrong end regardless:
    // init has already spent an OCR call per page plus segmentation by the time
    // run() is reached, so a guest who abandons after init cost real money and
    // paid nothing. The slot is now taken at init, and taking it twice would
    // charge one paper against two days of a one-per-day allowance.
    let allowanceBlock: ReturnType<typeof allowanceForResponse> | undefined
    if (markUserId) {
      if (!reservationSettled) {
        reservationSettled = true
        if (reservation) {
          await finalizeMarkReservation(markUserId, reservation, attemptId, 'mark_whole_paper')
        }
      }
      allowanceBlock = allowanceForResponse(await computeAllowance(markUserId))
    }
    await settleRunSuccess(attemptId)

    return NextResponse.json(
      await signMarkPayloadForClient({
        status: 'complete',
        whole_paper: wholePaper,
        attempt_id: attemptId,
        upload_mode: 'whole_paper',
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
        answer_photo_url: job.page_photo_urls?.[0] ?? null,
        marking_mode: 'official_mark_scheme',
        job: finalState,
        _allowance: allowanceBlock,
      })
    )
  } catch (err) {
    if (completed && wholePaper) {
      // The paper is marked and saved; only the bookkeeping after it failed.
      // Never write 'failed' over it and never release the mark — finalize if
      // that is what broke, and hand back the result (unsigned: the status
      // poll serves a signed copy).
      console.error('whole-paper run: error after the paper was saved (kept):', err)
      if (markUserId && reservation && !reservationSettled) {
        reservationSettled = true
        try {
          await finalizeMarkReservation(markUserId, reservation, attemptId, 'mark_whole_paper')
        } catch (finalizeErr) {
          console.error('whole-paper run: finalize after completion failed:', finalizeErr)
        }
      }
      await settleRunSuccess(attemptId)
      return NextResponse.json({
        status: 'complete',
        whole_paper: wholePaper,
        attempt_id: attemptId,
        upload_mode: 'whole_paper',
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
        marking_mode: 'official_mark_scheme',
      })
    }

    await releaseReservation()
    console.error('whole-paper run error:', err)

    const deadline = isRequestDeadlineError(err)
    const classified = classifyMarkingError(err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await settleRunError(classified.code, errorMessage)

    if (attemptId && job) {
      await updateJob(
        attemptId,
        failedState(
          deadline ? 'Marking ran out of time' : 'Marking failed',
          deadline
            ? `Marking ran out of time after ${results.length} of ${job.segmented_questions?.length ?? 0} questions. Retry to continue from where it stopped.`
            : errorMessage
        )
      )
    }
    return NextResponse.json(
      {
        error: deadline
          ? 'Marking ran out of time before every question was marked. Retry to continue from where it stopped — nothing was charged.'
          : 'Whole-paper marking failed.',
        retryable: true,
      },
      { status: deadline ? 503 : 500 }
    )
  }
}
