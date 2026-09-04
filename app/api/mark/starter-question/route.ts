import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/marking/mark-runner'
import { findStarterQuestion } from '@/lib/marking/starter-question'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One real past-paper question, for a visitor who arrived with nothing.
 *
 * 1,300 sessions opened /mark in 30 days and 93 typed a character. The page
 * asks for a question, an answer and three minutes; most arrivals have none of
 * them. This hands over the first one.
 *
 * Unauthenticated by design, like the marking routes themselves — guests mark,
 * and requiring an account to *see a question* would be the same wall that
 * costs the pricing page 59% of its visitors. Safe to leave open because it is
 * a bounded, indexed read of already-public past-paper text with no model call
 * behind it: nothing here can become an anonymous bill, which is the risk
 * /api/mark/topic-question has to guard against.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const subject = params.get('subject')
  // Set after a mark: the tags on the answer just marked, so the next question
  // lands on what they actually lost marks on.
  const topic = params.get('topic')

  try {
    const question = await findStarterQuestion(supabaseAdmin, subject, topic)
    if (!question) {
      // Not an error: a subject with no banked scheme simply has nothing to
      // offer, and the caller hides the invitation rather than showing a
      // failure for something the student never asked for.
      return NextResponse.json({ found: false }, { status: 200 })
    }

    return NextResponse.json({
      found: true,
      paper_code: question.paperCode,
      paper_session: question.paperSession,
      question_number: question.questionNumber,
      question_text: question.questionText,
      total_marks: question.totalMarks,
    })
  } catch (err) {
    console.error('[mark/starter-question]', err)
    return NextResponse.json({ found: false }, { status: 200 })
  }
}
