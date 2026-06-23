import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/marking/mark-runner'
import { findQuestionForTopic } from '@/lib/marking/topic-question'
import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { isIbSubjectCode, getIbMarkingProfile } from '@/lib/ib/marking-config'
import {
  buildIbTopicPracticePrompt,
  ibPracticeCriteriaSummary,
} from '@/lib/ib/practice-prompts'

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
    const topicMeta = getSyllabusTopicByCode(subjectCode, topicCode)
    const topicName = topicMeta?.name ?? topicCode

    if (isIbSubjectCode(subjectCode)) {
      const profile = getIbMarkingProfile(subjectCode)
      return NextResponse.json({
        found: false,
        ib_practice: true,
        subject_code: subjectCode,
        topic_code: topicCode,
        topic_name: topicName,
        practice_prompt: buildIbTopicPracticePrompt(subjectCode, topicCode),
        criteria_summary: ibPracticeCriteriaSummary(subjectCode),
        total_marks: profile?.practiceMaxMarks ?? null,
      })
    }

    const match = await findQuestionForTopic(supabaseAdmin, subjectCode, topicCode)

    if (!match) {
      return NextResponse.json({
        found: false,
        subject_code: subjectCode,
        topic_code: topicCode,
        topic_name: topicName,
      })
    }

    return NextResponse.json({
      found: true,
      subject_code: subjectCode,
      topic_code: topicCode,
      topic_name: topicName,
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
