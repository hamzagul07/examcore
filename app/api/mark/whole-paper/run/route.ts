import { NextRequest, NextResponse } from 'next/server'
import {
  aggregateWholePaperResults,
} from '@/lib/marking/whole-paper'
import { fetchPaperQuestionMeta } from '@/lib/marking/paper-questions'
import {
  markWholePaperQuestionSafe,
  supabaseAdmin,
} from '@/lib/marking/mark-runner'
import {
  isWholePaperJob,
  type WholePaperJobState,
} from '@/lib/marking/whole-paper-shared'
import type { QuestionMarkResult } from '@/lib/marking/types'
import { estimateMarkingSeconds } from '@/lib/marking/whole-paper'
import { pagesForQuestion } from '@/lib/marking/whole-paper-pages'
import {
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
import { effectiveAccess } from '@/lib/billing/access'
import { hasPriorityMarking } from '@/lib/billing/features'
import { withRequestDeadline } from '@/lib/ai/request-deadline'

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
  let reservation: MarkReservation | null = null
  let reservationSettled = false // flips once on finalize OR release → exactly-once

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
      .select('id, ai_marking, user_id')
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

    const job = attempt.ai_marking
    if (!isWholePaperJob(job)) {
      return NextResponse.json({ error: 'Invalid job state' }, { status: 400 })
    }

    if (job.phase === 'complete' && job.result) {
      return NextResponse.json({ status: 'complete', result: job.result })
    }

    if (job.phase === 'marking') {
      return NextResponse.json({ status: 'already_running' })
    }

    const paperCode = job.paper_code
    const paperSession = job.paper_session
    const segments = job.segmented_questions || []
    const pagesOcr = job.pages_ocr || []

    if (!paperCode || !paperSession || segments.length === 0) {
      return NextResponse.json({ error: 'Job missing paper context' }, { status: 400 })
    }

    const markingState: WholePaperJobState = {
      ...job,
      phase: 'marking',
      message: 'Marking your answers…',
      questions_completed: 0,
      questions_total: segments.length,
      priority: job.priority ?? 'standard',
    }

    // Atomically claim the job: flip phase→'marking' only if it is not already
    // 'marking'. Postgres serializes the row update, so of two near-simultaneous
    // POSTs exactly one matches the guard and proceeds; the loser gets 0 rows
    // and returns already_running. This closes the read-then-write (TOCTOU)
    // window that previously let a duplicate request mark the paper — and
    // reserve the quota — twice.
    const { data: claimed } = await supabaseAdmin
      .from('attempts')
      .update({ ai_marking: markingState, marks_earned: 0, total_marks: 0 })
      .eq('id', attemptId)
      .neq('ai_marking->>phase', 'marking')
      .select('id')
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ status: 'already_running' })
    }

    // Whole paper = 1 mark. Reserve after winning the claim; finalize on
    // success, release on failure — same single-request pattern as /mark/process.
    const markUserId = (attempt as { user_id?: string | null }).user_id ?? null
    if (markUserId) {
      reservation = await reserveMarkUsage(markUserId, 'mark_whole_paper')
      if (reservation.blocked_by_mode) {
        // Un-claim so a later retry isn't wedged in 'marking' with no runner.
        await supabaseAdmin
          .from('attempts')
          .update({ ai_marking: job })
          .eq('id', attemptId)
        return NextResponse.json(quotaExceededBody(reservation.allowance), { status: 402 })
      }
    }

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

    const results: QuestionMarkResult[] = []

    // Max priority deep marking: mark two questions at a time so whole papers
    // finish sooner while Pro/Scholar stay sequential (safer under load).
    const priorityDeep =
      !!reservation &&
      hasPriorityMarking(
        effectiveAccess({
          tier: reservation.allowance.tier,
          status: reservation.allowance.status,
        })
      )
    if (priorityDeep) markingState.priority = 'max'
    const batchSize = priorityDeep ? 2 : 1

    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize)
      const remaining = segments.length - i
      const estRemaining = estimateMarkingSeconds(remaining)

      await updateJob(attemptId, {
        ...markingState,
        phase: 'marking',
        message: priorityDeep
          ? `Max priority · marking questions ${i + 1}–${Math.min(i + batch.length, segments.length)} of ${segments.length}…`
          : `Marking question ${i + 1} of ${segments.length}…`,
        current_question: batch[0]?.question_number,
        questions_completed: i,
        questions_total: segments.length,
        estimated_seconds_remaining: estRemaining,
        partial_questions: results,
      })

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
        results.push(qResult)
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

    const wholePaper = aggregateWholePaperResults(
      paperCode,
      paperSession,
      results,
      paperQuestions
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
    }

    await supabaseAdmin
      .from('attempts')
      .update({
        ai_marking: wholePaper,
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
        time_spent_seconds: timeSpentSeconds,
      })
      .eq('id', attemptId)

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
    if (reservation && !reservationSettled) {
      reservationSettled = true
      await releaseMarkReservation(reservation)
    }
    console.error('whole-paper run error:', err)
    if (attemptId) {
      await supabaseAdmin
        .from('attempts')
        .update({
          ai_marking: {
            phase: 'failed',
            message: 'Marking failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            questions_total: 0,
            questions_completed: 0,
          },
        })
        .eq('id', attemptId)
    }
    return NextResponse.json(
      { error: 'Whole-paper marking failed.' },
      { status: 500 }
    )
  }
}
