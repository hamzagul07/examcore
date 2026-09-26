import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { notifyCommentUpvote } from '@/lib/community/notify'
import { voteErrorResponse, type VoteCommentRow } from '@/lib/community/vote-rpc'

/**
 * POST /api/community/comments/[id]/vote { value: 1 | -1 }
 *
 * One call to the `vote_comment` RPC, run as the signed-in user — see the
 * post vote route for why the previous read → upsert → bump sequence went.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
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

  const { data, error } = await supabase
    .rpc('vote_comment', { p_comment: id, p_value: value })
    .single<VoteCommentRow>()
  if (error || !data) {
    return voteErrorResponse(error, pendingCookies)
  }

  const isUp = data.new_value === 1
  const selfVote = data.comment_author === user.id
  if (!selfVote && isUp && !data.was_upvote && data.parent_post) {
    after(() =>
      notifyCommentUpvote({
        commentId: id,
        postId: data.parent_post,
        voterId: user.id,
      })
    )
  }

  return jsonWithAuthCookies({ value: data.new_value, score: data.comment_score ?? 0 }, pendingCookies)
}
