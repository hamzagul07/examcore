import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies, createServiceClient } from '@/lib/supabase-server'
import { votePost } from '@/lib/community/posts'
import { adjustAuthorSubjectRep, UPVOTE_REP } from '@/lib/community/vote-rep'
import { notifyPostUpvote, notifyPostScoreMilestone } from '@/lib/community/notify'

/** POST /api/community/posts/[id]/vote { value: 1 | -1 } — toggle/set vote. */
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
  // Previous vote value, so reputation can reverse when an upvote is toggled off
  // or flipped to a downvote — not just added when a new upvote appears.
  const { data: prevVote } = await admin
    .from('community_post_votes')
    .select('value')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  const wasUp = prevVote?.value === 1

  const newValue = await votePost(id, user.id, value)
  const isUp = newValue === 1

  const { data } = await admin
    .from('community_posts')
    .select('score, author_id, subject_code')
    .eq('id', id)
    .maybeSingle()

  const canRep = !!(data?.author_id && data.author_id !== user.id && data.subject_code)
  const repDelta = (isUp ? UPVOTE_REP : 0) - (wasUp ? UPVOTE_REP : 0)
  if (canRep && repDelta !== 0) {
    await adjustAuthorSubjectRep(admin, {
      authorId: data!.author_id as string,
      subjectCode: data!.subject_code as string,
      delta: repDelta,
    })
  }
  // Notify only on a NEW upvote (into the up state), never on toggle-off.
  if (canRep && isUp && !wasUp) {
    after(async () => {
      await notifyPostUpvote({ postId: id, voterId: user.id })
      await notifyPostScoreMilestone({
        postId: id,
        score: (data!.score as number) ?? 0,
        authorId: data!.author_id as string,
      })
    })
  }

  return jsonWithAuthCookies({ value: newValue, score: data?.score ?? 0 }, pendingCookies)
}
