import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent } from '@/lib/community/sanitize'
import type { Board } from '@/lib/community/notes'

export type Question = {
  id: string
  authorId: string
  authorUsername: string | null
  board: Board
  subjectCode: string
  topicCode: string | null
  lessonSlug: string | null
  questionId: string | null
  title: string
  bodyMd: string
  status: string
  answerCount: number
  voteCount: number
  acceptedAnswerId: string | null
  createdAt: string
}

export type Answer = {
  id: string
  questionId: string
  authorId: string
  authorUsername: string | null
  bodyMd: string
  voteCount: number
  isAccepted: boolean
  createdAt: string
}

async function usernames(admin: ReturnType<typeof createServiceClient>, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>()
  const { data } = await admin.from('user_profiles').select('id, username').in('id', [...new Set(ids)])
  return new Map<string, string | null>((data ?? []).map((p) => [p.id, p.username]))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapQuestion(r: any, username: string | null): Question {
  return {
    id: r.id, authorId: r.author_id, authorUsername: username, board: r.board,
    subjectCode: r.subject_code, topicCode: r.topic_code, lessonSlug: r.lesson_slug,
    questionId: r.question_id ?? null,
    title: r.title, bodyMd: r.body_md, status: r.status, answerCount: r.answer_count,
    voteCount: r.vote_count, acceptedAnswerId: r.accepted_answer_id, createdAt: r.created_at,
  }
}

export async function listQuestions(params: {
  board?: Board
  subjectCode?: string
  topicCode?: string
  lessonSlug?: string
  questionId?: string
  authorId?: string
  limit?: number
}): Promise<Question[]> {
  const admin = createServiceClient()
  let q = admin
    .from('community_questions')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)
  if (params.board) q = q.eq('board', params.board)
  if (params.subjectCode) q = q.eq('subject_code', params.subjectCode)
  if (params.topicCode) q = q.eq('topic_code', params.topicCode)
  if (params.lessonSlug) q = q.eq('lesson_slug', params.lessonSlug)
  if (params.questionId) q = q.eq('question_id', params.questionId)
  if (params.authorId) q = q.eq('author_id', params.authorId)
  const { data } = await q
  const rows = data ?? []
  const names = await usernames(admin, rows.map((r: any) => r.author_id))
  return rows.map((r: any) => mapQuestion(r, names.get(r.author_id) ?? null))
}

export async function getQuestion(id: string): Promise<{ question: Question; answers: Answer[] } | null> {
  const admin = createServiceClient()
  const { data: qrow } = await admin.from('community_questions').select('*').eq('id', id).maybeSingle()
  if (!qrow) return null
  const { data: arows } = await admin
    .from('community_answers')
    .select('*')
    .eq('question_id', id)
    .eq('status', 'published')
    .order('is_accepted', { ascending: false })
    .order('vote_count', { ascending: false })
  const answers = arows ?? []
  const names = await usernames(admin, [qrow.author_id, ...answers.map((a: any) => a.author_id)])
  return {
    question: mapQuestion(qrow, names.get(qrow.author_id) ?? null),
    answers: answers.map((a: any) => ({
      id: a.id, questionId: a.question_id, authorId: a.author_id,
      authorUsername: names.get(a.author_id) ?? null, bodyMd: a.body_md,
      voteCount: a.vote_count, isAccepted: a.is_accepted, createdAt: a.created_at,
    })),
  }
}

export type CreateResult = { ok: true; id: string; status: string; reason?: string } | { ok: false; error: string }

export async function createQuestion(input: {
  authorId: string; board: Board; subjectCode: string; subjectName?: string
  topicCode?: string | null; lessonSlug?: string | null; questionId?: string | null
  title: string; bodyMd: string
}): Promise<CreateResult> {
  const title = (input.title || '').trim().slice(0, 160)
  const body = clampNoteContent((input.bodyMd || '').trim(), 8000)
  if (title.length < 8) return { ok: false, error: 'Write a clear question title (at least 8 characters).' }
  const { screenContribution } = await import('@/lib/community/ai-screen')
  const verdict = await screenContribution({ kind: 'question', title, body, subject: input.subjectName || input.subjectCode })
  const status = verdict.ok ? 'published' : 'needs_edit'
  const admin = createServiceClient()
  const { data, error } = await admin.from('community_questions').insert({
    author_id: input.authorId, board: input.board, subject_code: input.subjectCode,
    topic_code: input.topicCode ?? null, lesson_slug: input.lessonSlug ?? null,
    question_id: input.questionId ?? null,
    title, body_md: body, status,
    moderation_reason: verdict.ok ? null : verdict.reason,
  }).select('id').single()
  if (error || !data) { console.error('[community/qa] question insert failed:', error); return { ok: false, error: 'Could not post your question.' } }
  return { ok: true, id: data.id, status, reason: verdict.reason }
}

export async function createAnswer(input: {
  questionId: string; authorId: string; bodyMd: string; subjectName?: string
}): Promise<CreateResult> {
  const body = clampNoteContent((input.bodyMd || '').trim(), 8000)
  if (body.length < 15) return { ok: false, error: 'Write a proper answer (at least 15 characters).' }
  const { screenContribution } = await import('@/lib/community/ai-screen')
  const verdict = await screenContribution({ kind: 'answer', body, subject: input.subjectName || 'this question' })
  const status = verdict.ok ? 'published' : 'needs_edit'
  const admin = createServiceClient()
  const { data, error } = await admin.from('community_answers').insert({
    question_id: input.questionId, author_id: input.authorId, body_md: body, status,
  }).select('id').single()
  if (error || !data) { console.error('[community/qa] answer insert failed:', error); return { ok: false, error: 'Could not post your answer.' } }

  // Notify the question author (not when answering your own question).
  if (status === 'published') {
    const { data: q } = await admin.from('community_questions').select('author_id, title').eq('id', input.questionId).maybeSingle()
    if (q && q.author_id !== input.authorId) {
      await admin.from('notifications').insert({
        user_id: q.author_id, type: 'answer',
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
