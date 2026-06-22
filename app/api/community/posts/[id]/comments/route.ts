import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createComment, getCommentTree } from '@/lib/community/comments'
import {
  moderateCommentAfterInsert,
  notifyPostAuthorOfComment,
} from '@/lib/community/moderate-async'
import { getUserUsername } from '@/lib/community/require-username'

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

  const username = await getUserUsername(user.id)
  if (!username) {
    return jsonWithAuthCookies(
      { error: 'Choose a username before commenting.', code: 'no_username' },
      pendingCookies,
      { status: 400 }
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
    if (result.isTopLevel) {
      await notifyPostAuthorOfComment(id, user.id)
    }
  })

  return jsonWithAuthCookies({ ok: true, id: result.id, status: result.status }, pendingCookies)
}
