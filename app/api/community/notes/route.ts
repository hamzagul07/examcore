import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { createNote, listNotes, type Board } from '@/lib/community/notes'

const DAILY_NOTE_CAP = 10

/** GET /api/community/notes?board=&subject=&topic=&lesson=&limit= — published notes. */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const board = sp.get('board')
  const notes = await listNotes({
    board: board === 'cambridge' || board === 'ib' ? (board as Board) : undefined,
    subjectCode: sp.get('subject') || undefined,
    topicCode: sp.get('topic') || undefined,
    lessonSlug: sp.get('lesson') || undefined,
    limit: Math.min(Number(sp.get('limit')) || 50, 100),
  })
  return Response.json({ notes })
}

/** POST /api/community/notes — create a note (auth + username + daily cap + AI gate). */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to contribute notes.' }, pendingCookies, { status: 401 })
  }
  let body: {
    board?: string
    subjectCode?: string
    subjectName?: string
    topicCode?: string
    lessonSlug?: string
    questionId?: string
    title?: string
    contentMd?: string
    imagePaths?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  if (body.board !== 'cambridge' && body.board !== 'ib') {
    return jsonWithAuthCookies({ error: 'Invalid board.' }, pendingCookies, { status: 400 })
  }
  if (!body.subjectCode || typeof body.subjectCode !== 'string') {
    return jsonWithAuthCookies({ error: 'Missing subject.' }, pendingCookies, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.username) {
    return jsonWithAuthCookies(
      { error: 'Choose a username before contributing.', code: 'no_username' },
      pendingCookies,
      { status: 400 }
    )
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('community_notes')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= DAILY_NOTE_CAP) {
    return jsonWithAuthCookies(
      { error: `Daily limit reached — you can post ${DAILY_NOTE_CAP} notes per day.` },
      pendingCookies,
      { status: 429 }
    )
  }

  const result = await createNote({
    authorId: user.id,
    board: body.board,
    subjectCode: body.subjectCode,
    topicCode: body.topicCode,
    lessonSlug: body.lessonSlug,
    questionId: body.questionId,
    title: body.title || '',
    contentMd: body.contentMd || '',
    imagePaths: Array.isArray(body.imagePaths) ? body.imagePaths.slice(0, 8) : [],
    subjectName: body.subjectName,
  })
  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  }
  return jsonWithAuthCookies(
    { ok: true, id: result.id, status: result.status, reason: result.reason ?? null },
    pendingCookies
  )
}
