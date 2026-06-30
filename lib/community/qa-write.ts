import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent } from '@/lib/community/sanitize'
import type { Board } from '@/lib/community/notes-types'
import type { CreateResult } from '@/lib/community/qa-types'

export async function createQuestion(input: {
  authorId: string
  board: Board
  subjectCode: string
  subjectName?: string
  topicCode?: string | null
  lessonSlug?: string | null
  questionId?: string | null
  title: string
  bodyMd: string
}): Promise<CreateResult> {
  const title = (input.title || '').trim().slice(0, 160)
  const body = clampNoteContent((input.bodyMd || '').trim(), 8000)
  if (title.length < 8) return { ok: false, error: 'Write a clear question title (at least 8 characters).' }
  const { screenContribution } = await import('@/lib/community/ai-screen')
  const verdict = await screenContribution({
    kind: 'question',
    title,
    body,
    subject: input.subjectName || input.subjectCode,
  })
  const status = verdict.ok ? 'published' : 'needs_edit'
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('community_questions')
    .insert({
      author_id: input.authorId,
      board: input.board,
      subject_code: input.subjectCode,
      topic_code: input.topicCode ?? null,
      lesson_slug: input.lessonSlug ?? null,
      question_id: input.questionId ?? null,
      title,
      body_md: body,
      status,
      moderation_reason: verdict.ok ? null : verdict.reason,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[community/qa] question insert failed:', error)
    return { ok: false, error: 'Could not post your question.' }
  }
  return { ok: true, id: data.id, status, reason: verdict.reason }
}

export async function createAnswer(input: {
  questionId: string
  authorId: string
  bodyMd: string
  subjectName?: string
}): Promise<CreateResult> {
  const body = clampNoteContent((input.bodyMd || '').trim(), 8000)
  if (body.length < 15) return { ok: false, error: 'Write a proper answer (at least 15 characters).' }
  const { screenContribution } = await import('@/lib/community/ai-screen')
  const verdict = await screenContribution({
    kind: 'answer',
    body,
    subject: input.subjectName || 'this question',
  })
  const status = verdict.ok ? 'published' : 'needs_edit'
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('community_answers')
    .insert({
      question_id: input.questionId,
      author_id: input.authorId,
      body_md: body,
      status,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[community/qa] answer insert failed:', error)
    return { ok: false, error: 'Could not post your answer.' }
  }

  if (status === 'published') {
    const { data: q } = await admin
      .from('community_questions')
      .select('author_id, title')
      .eq('id', input.questionId)
      .maybeSingle()
    if (q && q.author_id !== input.authorId) {
      await admin.from('notifications').insert({
        user_id: q.author_id,
        type: 'answer',
        title: `New answer to "${(q.title as string).slice(0, 60)}"`,
        href: `/community/questions/${input.questionId}`,
      })
    }
  }
  return { ok: true, id: data.id, status, reason: verdict.reason }
}

export async function acceptAnswer(questionId: string, answerId: string, userId: string): Promise<boolean> {
  const admin = createServiceClient()
  const { data, error } = await admin.rpc('community_accept_answer', {
    p_question_id: questionId,
    p_answer_id: answerId,
    p_user_id: userId,
  })
  if (error) {
    console.error('[community/qa] accept_answer rpc failed:', error)
    return false
  }
  return data === true
}
