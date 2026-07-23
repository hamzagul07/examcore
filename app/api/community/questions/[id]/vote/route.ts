import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { adjustAuthorSubjectRep, UPVOTE_REP } from '@/lib/community/vote-rep'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Sign in to vote.' }, pendingCookies, { status: 401 })
  const { id } = await params
  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('community_question_votes')
    .select('question_id')
    .eq('question_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Needed on both the vote and un-vote paths so reputation reverses on toggle-off.
  const { data: q } = await admin
    .from('community_questions')
    .select('author_id, subject_code')
    .eq('id', id)
    .maybeSingle()
  const repTarget =
    q?.author_id && q.author_id !== user.id && q.subject_code
      ? { authorId: q.author_id as string, subjectCode: q.subject_code as string }
      : null

  let voted: boolean
  if (existing) {
    await admin.from('community_question_votes').delete().eq('question_id', id).eq('user_id', user.id)
    voted = false
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: -UPVOTE_REP })
  } else {
    const { error } = await admin.from('community_question_votes').insert({ question_id: id, user_id: user.id })
    if (error) return jsonWithAuthCookies({ error: 'Could not vote.' }, pendingCookies, { status: 500 })
    voted = true
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: UPVOTE_REP })
  }
  const { data } = await admin.from('community_questions').select('vote_count').eq('id', id).maybeSingle()
  return jsonWithAuthCookies({ voted, voteCount: data?.vote_count ?? 0 }, pendingCookies)
}
