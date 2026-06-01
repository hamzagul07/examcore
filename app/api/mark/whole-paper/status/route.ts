import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/marking/mark-runner'
import {
  isWholePaperJob,
  jobToResult,
} from '@/lib/marking/whole-paper-shared'
import type { WholePaperResult } from '@/lib/marking/types'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'

export async function GET(request: NextRequest) {
  const attemptId = new URL(request.url).searchParams.get('attempt_id')
  if (!attemptId) {
    return NextResponse.json({ error: 'attempt_id required' }, { status: 400 })
  }

  const { data: attempt, error } = await supabaseAdmin
    .from('attempts')
    .select('id, ai_marking, marks_earned, total_marks, answer_photo_url')
    .eq('id', attemptId)
    .maybeSingle()

  if (error || !attempt) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const marking = attempt.ai_marking

  if (isWholePaperJob(marking)) {
    const result = jobToResult(marking)
    return NextResponse.json(
      await signMarkPayloadForClient({
        attempt_id: attempt.id,
        phase: marking.phase,
        message: marking.message,
        questions_total: marking.questions_total,
        questions_completed: marking.questions_completed,
        current_question: marking.current_question,
        estimated_seconds_remaining: marking.estimated_seconds_remaining,
        loading_context: marking.loading_context,
        partial_questions: marking.partial_questions,
        result,
        error: marking.error,
        answer_photo_url: attempt.answer_photo_url,
        upload_mode: 'whole_paper',
      })
    )
  }

  if (marking && typeof marking === 'object' && 'upload_mode' in marking) {
    const wp = marking as WholePaperResult
    return NextResponse.json(
      await signMarkPayloadForClient({
        attempt_id: attempt.id,
        phase: 'complete',
        message: 'Marking complete',
        questions_total: wp.questions.length,
        questions_completed: wp.questions.length,
        result: wp,
        answer_photo_url: attempt.answer_photo_url,
        upload_mode: 'whole_paper',
      })
    )
  }

  return NextResponse.json({ error: 'Not a whole-paper job' }, { status: 400 })
}
