import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { createQuestion, listQuestions } from '@/lib/community/qa'
import type { Board } from '@/lib/community/notes'

const DAILY_CAP = 20

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const board = sp.get('board')
  const questions = await listQuestions({
    board: board === 'cambridge' || board === 'ib' ? (board as Board) : undefined,
    subjectCode: sp.get('subject') || undefined,
    topicCode: sp.get('topic') || undefined,
    lessonSlug: sp.get('lesson') || undefined,
    limit: Math.min(Number(sp.get('limit')) || 50, 100),
  })
  return Response.json({ questions })
}

export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to ask a question.' }, pendingCookies, { status: 401 })
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  if (body.board !== 'cambridge' && body.board !== 'ib') {
    return jsonWithAuthCookies({ error: 'Invalid board.' }, pendingCookies, { status: 400 })
  }
  if (!body.subjectCode) {
    return jsonWithAuthCookies({ error: 'Missing subject.' }, pendingCookies, { status: 400 })
  }
  const admin = createServiceClient()
  const { data: profile } = await admin.from('user_profiles').select('username').eq('id', user.id).maybeSingle()
  if (!profile?.username) {
    return jsonWithAuthCookies({ error: 'Choose a username first.', code: 'no_username' }, pendingCookies, { status: 400 })
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('community_questions')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= DAILY_CAP) {
    return jsonWithAuthCookies({ error: `Daily limit reached (${DAILY_CAP} questions/day).` }, pendingCookies, { status: 429 })
  }
  const result = await createQuestion({
    authorId: user.id,
    board: body.board as Board,
    subjectCode: body.subjectCode,
    subjectName: body.subjectName,
    topicCode: body.topicCode,
    lessonSlug: body.lessonSlug,
    title: body.title || '',
    bodyMd: body.bodyMd || '',
  })
  if (!result.ok) return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  return jsonWithAuthCookies({ ok: true, id: result.id, status: result.status, reason: result.reason ?? null }, pendingCookies)
}
