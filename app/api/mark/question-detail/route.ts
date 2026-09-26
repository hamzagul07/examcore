import { NextRequest, NextResponse } from 'next/server'
import { findMarkSchemeRow } from '@/lib/marking/mark-runner'
import { extractMarkSchemeRubric } from '@/lib/marking/mark-scheme-display'
import type { MarkingStyle } from '@/lib/marking/types'
import { createServiceClient } from '@/lib/supabase/service'
import {
  clientIp,
  consumeQuestionDetailSlot,
  RateLimitUnavailableError,
} from '@/lib/rate-limit'
import { rateLimitJson } from '@/lib/http/rate-limit-response'

/** Longest legitimate values: a paper code is "9709/12", a session "m24",
 * a question number "12(b)(iii)". Anything longer is not a lookup. */
const MAX_PARAM_CHARS = 64

/**
 * Question metadata for the mark page's preview panel — title, total, style,
 * counts. Never the scheme text.
 *
 * Unauthenticated by design: the panel shows before sign-in and a guest's
 * first mark depends on it. The daily per-IP cap exists because
 * findMarkSchemeRow's fallback scans every question of the paper when the
 * number does not match directly, and an unauthenticated route with no cap was
 * the cheapest way to drive that scan. The cap is far above what a class on
 * one IP types in a day (the panel fires per keystroke), so it bounds a
 * scraper, not a student.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const paperCode = params.get('paper_code')?.trim()
  const paperSession = params.get('paper_session')?.trim()
  const questionNumber = params.get('question_number')?.trim()

  if (!paperCode || !paperSession || !questionNumber) {
    return NextResponse.json(
      { error: 'paper_code, paper_session, and question_number are required' },
      { status: 400 }
    )
  }
  if (
    paperCode.length > MAX_PARAM_CHARS ||
    paperSession.length > MAX_PARAM_CHARS ||
    questionNumber.length > MAX_PARAM_CHARS
  ) {
    return NextResponse.json({ error: 'Parameter too long' }, { status: 400 })
  }

  try {
    const slot = await consumeQuestionDetailSlot(createServiceClient(), clientIp(request))
    if (!slot.allowed) return rateLimitJson(slot.message)
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { error: 'Question lookup is briefly unavailable. Try again in a minute.' },
        { status: 503 }
      )
    }
    throw err
  }

  try {
    const row = await findMarkSchemeRow(paperCode, paperSession, questionNumber)

    if (!row) {
      return NextResponse.json({
        found: false,
        paper_code: paperCode,
        paper_session: paperSession,
        question_number: questionNumber,
      })
    }

    const rubric = extractMarkSchemeRubric(
      row.mark_scheme,
      row.marking_type as MarkingStyle | null
    )

    return NextResponse.json({
      found: true,
      id: row.id,
      paper_code: row.paper_code,
      paper_session: row.paper_session,
      question_number: row.question_number,
      subject: row.subject,
      question_text: row.question_text ?? '',
      total_marks: row.total_marks ?? null,
      marking_type: (row.marking_type as MarkingStyle | null) ?? rubric?.style ?? null,
      syllabus_tags: (row.syllabus_tags as string[] | null) ?? [],
      // rubric stays server-side only — scheme text must never reach the client
      point_count: rubric?.points.length ?? 0,
      band_count: rubric?.bands.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
