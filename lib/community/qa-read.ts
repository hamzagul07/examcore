import { createServiceClient } from '@/lib/supabase-server'
import type { Answer, Question } from '@/lib/community/qa-types'
import type { Board } from '@/lib/community/notes-types'

async function usernames(admin: ReturnType<typeof createServiceClient>, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>()
  const { data } = await admin.from('user_profiles').select('id, username').in('id', [...new Set(ids)])
  return new Map<string, string | null>((data ?? []).map((p) => [p.id, p.username]))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapQuestion(r: any, username: string | null): Question {
  return {
    id: r.id,
    authorId: r.author_id,
    authorUsername: username,
    board: r.board,
    subjectCode: r.subject_code,
    topicCode: r.topic_code,
    lessonSlug: r.lesson_slug,
    questionId: r.question_id ?? null,
    title: r.title,
    bodyMd: r.body_md,
    status: r.status,
    answerCount: r.answer_count,
    voteCount: r.vote_count,
    acceptedAnswerId: r.accepted_answer_id,
    createdAt: r.created_at,
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
      id: a.id,
      questionId: a.question_id,
      authorId: a.author_id,
      authorUsername: names.get(a.author_id) ?? null,
      bodyMd: a.body_md,
      voteCount: a.vote_count,
      isAccepted: a.is_accepted,
      createdAt: a.created_at,
    })),
  }
}
