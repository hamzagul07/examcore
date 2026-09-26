import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createComment, getCommentTree } from '@/lib/community/comments'
import {
  moderateCommentAfterInsert,
} from '@/lib/community/moderate-async'
import { notifyCommentActivity, notifyMentions } from '@/lib/community/notify'
import { ensureUsername } from '@/lib/community/ensure-username'
import { commentsInLast24h } from '@/lib/community/require-username'

/**
 * Comments per author per rolling day. Posts (25), questions (20) and notes
 * (10) have always had one; comments did not, which made them the one
 * unbounded source of mention notifications and emails. Sixty is well above
 * what an active thread day looks like (the busiest genuine day on record
 * is under twenty).
 */
const DAILY_COMMENT_CAP = 60

/** GET /api/community/posts/[id]/comments — full comment tree. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await getCommentTree(id)
  return Response.json({ comments })
}

/** POST /api/community/posts/[id]/comments { bodyMd, parentId? } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to comment.' }, pendingCookies, { status: 401 })
  const { id } = await params
  let body: { bodyMd?: string; parentId?: string; subjectName?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }

  const { username, assigned: usernameAssigned } = await ensureUsername(user.id)
  if (!username) {
    return jsonWithAuthCookies(
      { error: 'Could not set up your public name — try again.' },
      pendingCookies,
      { status: 500 }
    )
  }

  if ((await commentsInLast24h(user.id)) >= DAILY_COMMENT_CAP) {
    return jsonWithAuthCookies(
      { error: `Daily limit reached — you can post ${DAILY_COMMENT_CAP} comments per day.` },
      pendingCookies,
      { status: 429 }
    )
  }

  const result = await createComment({
    postId: id,
    parentId: body.parentId ?? null,
    authorId: user.id,
    bodyMd: body.bodyMd || '',
    subjectName: body.subjectName,
  })
  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, { status: 400 })
  }

  after(async () => {
    await moderateCommentAfterInsert(result.id, { body: result.body, subject: result.subject })
    await notifyCommentActivity({
      postId: id,
      commentId: result.id,
      commentAuthorId: user.id,
      parentId: body.parentId ?? null,
      bodyPreview: result.body.slice(0, 200),
    })
    await notifyMentions({
      authorId: user.id,
      postId: id,
      commentId: result.id,
      text: body.bodyMd || '',
    })
  })

  return jsonWithAuthCookies(
    // Only present on the contribution that created the handle, so the client
    // can tell them what name just went public.
    {
      ok: true,
      id: result.id,
      status: result.status,
      ...(usernameAssigned ? { assignedUsername: username } : {}),
    },
    pendingCookies
  )
}
