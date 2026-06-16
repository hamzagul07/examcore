import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/marking/mark-runner'
import { findQuestionForTopic } from '@/lib/marking/topic-question'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const subjectCode = params.get('subject')?.trim()
  const topicCode = params.get('topic')?.trim()

  if (!subjectCode || !topicCode) {
    return NextResponse.json(
      { error: 'subject and topic are required' },
      { status: 400 }
    )
  }

  try {
    const match = await findQuestionForTopic(supabaseAdmin, subjectCode, topicCode)
    const topicMeta = getSyllabusTopicByCode(subjectCode, topicCode)

    if (!match) {
      return NextResponse.json({
        found: false,
        subject_code: subjectCode,
        topic_code: topicCode,
        topic_name: topicMeta?.name ?? topicCode,
      })
    }

    return NextResponse.json({
      found: true,
      subject_code: subjectCode,
      topic_code: topicCode,
      topic_name: topicMeta?.name ?? topicCode,
      matched_topic: match.matched_topic,
      paper_code: match.paper_code,
      paper_session: match.paper_session,
      question_number: match.question_number,
      question_text: match.question_text,
      total_marks: match.total_marks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
