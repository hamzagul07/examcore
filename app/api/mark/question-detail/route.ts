import { NextRequest, NextResponse } from 'next/server'
import { findMarkSchemeRow } from '@/lib/marking/mark-runner'
import { extractMarkSchemeRubric } from '@/lib/marking/mark-scheme-display'
import type { MarkingStyle } from '@/lib/marking/types'

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
      rubric,
      point_count: rubric?.points.length ?? 0,
      band_count: rubric?.bands.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
