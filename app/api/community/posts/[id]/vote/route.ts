import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { notifyPostUpvote, notifyPostScoreMilestone } from '@/lib/community/notify'
import { voteErrorResponse, type VotePostRow } from '@/lib/community/vote-rpc'

/**
 * POST /api/community/posts/[id]/vote { value: 1 | -1 } — toggle/set vote.
 *
 * The whole vote — read the previous value, upsert or delete, credit or
 * debit the author's subject reputation — is one call to the `vote_post`
 * RPC (20260925_community_votes_rpc.sql), run as the signed-in user so
 * `auth.uid()` is the voter. It used to be three round trips from here, and
 * two concurrent upvotes from one user both read "no previous vote" and
 * credited the author twice (code review 2026-09-25, §2 Community).
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
    .rpc('vote_post', { p_post: id, p_value: value })
    .single<VotePostRow>()
  if (error || !data) {
    return voteErrorResponse(error, pendingCookies)
  }

  const isUp = data.new_value === 1
  const selfVote = data.post_author === user.id
  // Notify only on a NEW upvote (into the up state), never on toggle-off.
  if (!selfVote && isUp && !data.was_upvote) {
    after(async () => {
      await notifyPostUpvote({ postId: id, voterId: user.id })
      await notifyPostScoreMilestone({
        postId: id,
        score: data.post_score ?? 0,
        authorId: data.post_author,
      })
    })
  }

  return jsonWithAuthCookies({ value: data.new_value, score: data.post_score ?? 0 }, pendingCookies)
}
