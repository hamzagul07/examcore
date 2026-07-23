import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies, createServiceClient } from '@/lib/supabase-server'
import { voteComment } from '@/lib/community/comments'
import { adjustAuthorSubjectRep, UPVOTE_REP } from '@/lib/community/vote-rep'
import { notifyCommentUpvote } from '@/lib/community/notify'

/** POST /api/community/comments/[id]/vote { value: 1 | -1 } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to vote.' }, pendingCookies, { status: 401 })
  const { id } = await params
  let value: number
  try {
    value = (await request.json()).value
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request.' }, pendingCookies, { status: 400 })
  }
  if (value !== 1 && value !== -1) {
    return jsonWithAuthCookies({ error: 'Invalid vote.' }, pendingCookies, { status: 400 })
  }

  const admin = createServiceClient()
  // Previous vote value, so reputation reverses on toggle-off / flip to downvote.
  const { data: prevVote } = await admin
    .from('community_comment_votes')
    .select('value')
    .eq('comment_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  const wasUp = prevVote?.value === 1

  const newValue = await voteComment(id, user.id, value)
  const isUp = newValue === 1

  const { data } = await admin
    .from('community_comments')
    .select('score, author_id, post_id, community_posts(subject_code)')
    .eq('id', id)
    .maybeSingle()

  const subjectCode = (data?.community_posts as { subject_code?: string } | null)?.subject_code
  const canRep = !!(data?.author_id && data.author_id !== user.id && subjectCode)
  const repDelta = (isUp ? UPVOTE_REP : 0) - (wasUp ? UPVOTE_REP : 0)
  if (canRep && repDelta !== 0) {
    await adjustAuthorSubjectRep(admin, {
      authorId: data!.author_id as string,
      subjectCode: subjectCode as string,
      delta: repDelta,
    })
  }
  if (canRep && isUp && !wasUp && data!.post_id) {
    after(() =>
      notifyCommentUpvote({
        commentId: id,
        postId: data!.post_id as string,
        voterId: user.id,
      })
    )
  }

  return jsonWithAuthCookies({ value: newValue, score: data?.score ?? 0 }, pendingCookies)
}
