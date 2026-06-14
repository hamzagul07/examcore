import { NextRequest, NextResponse } from 'next/server'
import { aggregateWholePaperResults } from '@/lib/marking/whole-paper'
import { fetchPaperQuestionMeta } from '@/lib/marking/paper-questions'
import {
  markWholePaperQuestionSafe,
  supabaseAdmin,
} from '@/lib/marking/mark-runner'
import { pagesForQuestion } from '@/lib/marking/whole-paper-pages'
import type { StoredPageOcr } from '@/lib/marking/whole-paper-pages'
import type { QuestionMarkResult, WholePaperResult } from '@/lib/marking/types'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { checkAnonymousMarkRateLimit, clientIp } from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const attemptId = body.attempt_id as string
    const questionNumber = body.question_number as string

    if (!attemptId || !questionNumber) {
      return NextResponse.json(
        { error: 'attempt_id and question_number required' },
        { status: 400 }
      )
    }

    const { supabase: supabaseAuth, user, pendingCookies } =
      await authenticateRouteRequest(request)

    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('ai_marking, user_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (error || !attempt?.ai_marking) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

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
    } else {
      const ip = clientIp(request)
      const rateCheck = await checkAnonymousMarkRateLimit(supabaseAdmin, ip, null)
      if (!rateCheck.allowed) {
        return rateLimitJson(rateCheck.message)
      }
    }

    const existing = attempt.ai_marking as WholePaperResult
    if (existing.upload_mode !== 'whole_paper') {
      return NextResponse.json({ error: 'Not a whole-paper result' }, { status: 400 })
    }

    const paperCode = existing.paper_code
    const paperSession = existing.paper_session
    if (!paperCode || !paperSession) {
      return NextResponse.json({ error: 'Missing paper context' }, { status: 400 })
    }

    const prev = existing.questions.find(
      (q) => q.question_number === questionNumber
    )
    const answerText = prev?.answer_text || body.answer_text as string
    if (!answerText?.trim()) {
      return NextResponse.json(
        { error: 'No answer text available to retry' },
        { status: 400 }
      )
    }

    const storedPages = (existing.pages_ocr || []) as StoredPageOcr[]
    const questionPages = pagesForQuestion(questionNumber, storedPages)

    const retried = await markWholePaperQuestionSafe({
      paperCode,
      paperSession,
      questionNumber,
      answerText,
      questionPages,
    })

    const updatedQuestions: QuestionMarkResult[] = existing.questions.map((q) =>
      q.question_number === questionNumber
        ? { ...retried, answer_text: answerText }
        : q
    )

    const attempted = updatedQuestions.filter((q) => q.status !== 'unattempted')

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

    const wholePaper = aggregateWholePaperResults(
      paperCode,
      paperSession,
      attempted,
      paperQuestions
    )
    wholePaper.pages_ocr = storedPages

    await supabaseAdmin
      .from('attempts')
      .update({
        ai_marking: wholePaper,
        marks_earned: wholePaper.marks_earned,
        total_marks: wholePaper.total_marks,
      })
      .eq('id', attemptId)

    return NextResponse.json({ whole_paper: wholePaper })
  } catch (err) {
    console.error('whole-paper retry error:', err)
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 }
    )
  }
}
