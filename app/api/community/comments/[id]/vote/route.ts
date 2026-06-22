import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies, createServiceClient } from '@/lib/supabase-server'
import { voteComment } from '@/lib/community/comments'
import { bumpAuthorRepOnUpvote } from '@/lib/community/vote-rep'

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

  const newValue = await voteComment(id, user.id, value)

  const admin = createServiceClient()
  const { data } = await admin
    .from('community_comments')
    .select('score, author_id, community_posts(subject_code)')
    .eq('id', id)
    .maybeSingle()

  const subjectCode = (data?.community_posts as { subject_code?: string } | null)?.subject_code
  if (newValue === 1 && data?.author_id && data.author_id !== user.id && subjectCode) {
    await bumpAuthorRepOnUpvote(admin, { authorId: data.author_id as string, subjectCode })
  }

  return jsonWithAuthCookies({ value: newValue, score: data?.score ?? 0 }, pendingCookies)
}
