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
  recordMarkUsage,
  computeAllowance,
  allowanceForResponse,
} from '@/lib/billing/enforcement'
import { clientIp, checkAnonymousMarkRateLimit, incrementAnonymousMarkRateLimit } from '@/lib/rate-limit'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'

export const maxDuration = 300

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

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let attemptId: string | null = null

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
    }
    await updateJob(attemptId, markingState)

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

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const remaining = segments.length - i
      const estRemaining = estimateMarkingSeconds(remaining)

      await updateJob(attemptId, {
        ...markingState,
        phase: 'marking',
        message: `Marking question ${i + 1} of ${segments.length}…`,
        current_question: seg.question_number,
        questions_completed: i,
        questions_total: segments.length,
        estimated_seconds_remaining: estRemaining,
        partial_questions: results,
      })

      const questionPages =
        seg.page_indices?.length && pagesOcr.length
          ? seg.page_indices
              .map((i) => pagesOcr[i])
              .filter((p): p is NonNullable<typeof p> => !!p)
          : pagesForQuestion(seg.question_number, pagesOcr)

      const qResult = await markWholePaperQuestionSafe({
        paperCode,
        paperSession,
        questionNumber: seg.question_number,
        answerText: seg.answer_text,
        questionPages,
      })
      results.push({ ...qResult, answer_text: seg.answer_text })

      const tags =
        qResult.syllabus_tags ??
        qResult.ai_marking?.syllabus_tags ??
        []

      await updateJob(attemptId, {
        ...markingState,
        phase: 'marking',
        message: `Marking question ${i + 1} of ${segments.length}…`,
        current_question: seg.question_number,
        questions_completed: i + 1,
        questions_total: segments.length,
        estimated_seconds_remaining: estimateMarkingSeconds(segments.length - i - 1),
        partial_questions: results,
        loading_context: {
          paper_code: paperCode,
          paper_session: paperSession,
          question_number: seg.question_number,
          syllabus_tags: tags.length ? tags : undefined,
        },
      })
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

    // Whole paper = exactly 1 mark, recorded on completion success only.
    const markUserId = (attempt as { user_id?: string | null }).user_id ?? null
    if (!markUserId) {
      const ip = clientIp(request)
      const rateCheck = await checkAnonymousMarkRateLimit(supabaseAdmin, ip, null)
      await incrementAnonymousMarkRateLimit(
        supabaseAdmin,
        ip,
        null,
        rateCheck.allowed ? rateCheck.count : 0
      )
    }
    let allowanceBlock: ReturnType<typeof allowanceForResponse> | undefined
    if (markUserId) {
      await recordMarkUsage(markUserId, attemptId, 'mark_whole_paper')
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
