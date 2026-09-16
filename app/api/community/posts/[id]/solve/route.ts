import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/community/posts/[id]/solve { commentId: string | null }
 *
 * The post's author marks one comment as the answer, or clears it by sending
 * null. Nothing else in the community says a doubt has been resolved, so this
 * is what separates a thread worth reading from one still hanging — and what
 * gives the person who answered it any credit.
 *
 * Two checks carry the whole feature, and both are done server-side because a
 * client can claim anything:
 *   1. only the post's author may accept an answer to their own question, and
 *   2. the comment must belong to THIS post — otherwise any comment id in the
 *      database could be promoted onto any post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in first.' }, pendingCookies, { status: 401 })
  }

  const { id } = await params

  let commentId: unknown
  try {
    commentId = (await request.json()).commentId
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request.' }, pendingCookies, { status: 400 })
  }
  if (commentId !== null && typeof commentId !== 'string') {
    return jsonWithAuthCookies({ error: 'Invalid comment.' }, pendingCookies, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: post } = await admin
    .from('community_posts')
    .select('id, author_id, is_locked')
    .eq('id', id)
    .maybeSingle()

  if (!post) {
    return jsonWithAuthCookies({ error: 'Post not found.' }, pendingCookies, { status: 404 })
  }
  if (post.author_id !== user.id) {
    // Deliberately the same wording whether or not the post exists to them:
    // who wrote a post is not a secret, but the answer should not differ.
    return jsonWithAuthCookies(
      { error: 'Only the person who asked can mark the answer.' },
      pendingCookies,
      { status: 403 }
    )
  }
  if (post.is_locked) {
    return jsonWithAuthCookies({ error: 'This thread is locked.' }, pendingCookies, { status: 403 })
  }

  if (commentId) {
    const { data: comment } = await admin
      .from('community_comments')
      .select('id, post_id')
      .eq('id', commentId)
      .maybeSingle()

    // Checked against THIS post, not merely "exists" — without this, any
    // comment anywhere could be marked as the answer to any question.
    if (!comment || comment.post_id !== id) {
      return jsonWithAuthCookies(
        { error: 'That comment is not on this post.' },
        pendingCookies,
        { status: 400 }
      )
    }
  }

  const { error } = await admin
    .from('community_posts')
    .update({
      solved_comment_id: commentId,
      solved_at: commentId ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) {
    return jsonWithAuthCookies({ error: error.message }, pendingCookies, { status: 500 })
  }

  return jsonWithAuthCookies({ ok: true, solvedCommentId: commentId }, pendingCookies)
}
