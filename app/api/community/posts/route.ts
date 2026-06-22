import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createPost, listPosts, type Board, type PostKind, type PostSort } from '@/lib/community/posts'
import { getUserUsername, postsInLast24h } from '@/lib/community/require-username'
import type { CommunityAttachment } from '@/lib/community/uploads'
import { attachmentKindForMime } from '@/lib/community/uploads'

const DAILY_POST_CAP = 25

/** GET /api/community/posts?subject=&board=&kind=&sort=&topic=&lesson=&question=&author=&limit= */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const board = sp.get('board')
  const kind = sp.get('kind')
  const sort = sp.get('sort')
  const posts = await listPosts({
    board: board === 'cambridge' || board === 'ib' ? (board as Board) : undefined,
    subjectCode: sp.get('subject') || undefined,
    topicCode: sp.get('topic') || undefined,
    lessonSlug: sp.get('lesson') || undefined,
    questionId: sp.get('question') || undefined,
    authorId: sp.get('author') || undefined,
    kind: ['discussion', 'question', 'resource'].includes(kind || '') ? (kind as PostKind) : undefined,
    sort: ['hot', 'new', 'top', 'rising'].includes(sort || '') ? (sort as PostSort) : 'hot',
    limit: Math.min(Number(sp.get('limit')) || 25, 100),
  })
  return Response.json({ posts })
}

/** POST /api/community/posts — create a post. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to post.' }, pendingCookies, { status: 401 })
  }
  let body: {
    board?: string
    subjectCode?: string
    subjectName?: string
    topicCode?: string
    lessonSlug?: string
    questionId?: string
    kind?: string
    flair?: string
    title?: string
    bodyMd?: string
    attachments?: CommunityAttachment[]
  }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  if (body.board !== 'cambridge' && body.board !== 'ib') {
    return jsonWithAuthCookies({ error: 'Pick a subject board.' }, pendingCookies, { status: 400 })
  }
  if (!body.subjectCode) {
    return jsonWithAuthCookies({ error: 'Pick a subject.' }, pendingCookies, { status: 400 })
  }
  const kind = ['discussion', 'question', 'resource'].includes(body.kind || '')
    ? (body.kind as PostKind)
    : 'discussion'

  const username = await getUserUsername(user.id)
  if (!username) {
    return jsonWithAuthCookies(
      { error: 'Choose a username before posting.', code: 'no_username' },
      pendingCookies,
      { status: 400 }
    )
  }

  if ((await postsInLast24h(user.id)) >= DAILY_POST_CAP) {
    return jsonWithAuthCookies(
      { error: `Daily limit reached — you can create ${DAILY_POST_CAP} posts per day.` },
      pendingCookies,
      { status: 429 }
    )
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments
        .filter((a) => a && typeof a.path === 'string' && attachmentKindForMime(a.mime))
        .slice(0, 10)
    : []

  const result = await createPost({
    authorId: user.id,
    board: body.board,
    subjectCode: body.subjectCode,
    subjectName: body.subjectName,
    topicCode: body.topicCode,
    lessonSlug: body.lessonSlug,
    questionId: body.questionId,
    kind,
    flair: body.flair,
    title: body.title || '',
    bodyMd: body.bodyMd || '',
    attachments,
  })
  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  }
  return jsonWithAuthCookies(
    { ok: true, id: result.id, status: result.status, reason: result.reason ?? null },
    pendingCookies
  )
}
