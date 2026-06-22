import { NextRequest, after } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies, createServiceClient } from '@/lib/supabase-server'
import { votePost } from '@/lib/community/posts'
import { bumpAuthorRepOnUpvote } from '@/lib/community/vote-rep'
import { notifyPostUpvote } from '@/lib/community/notify'

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

  const newValue = await votePost(id, user.id, value)

  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select('score, author_id, subject_code')
    .eq('id', id)
    .maybeSingle()

  if (newValue === 1 && data?.author_id && data.author_id !== user.id && data.subject_code) {
    await bumpAuthorRepOnUpvote(admin, {
      authorId: data.author_id as string,
      subjectCode: data.subject_code as string,
    })
    after(() => notifyPostUpvote({ postId: id, voterId: user.id }))
  }

  return jsonWithAuthCookies({ value: newValue, score: data?.score ?? 0 }, pendingCookies)
}
