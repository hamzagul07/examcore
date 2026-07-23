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
    .from('community_answer_votes')
    .select('answer_id')
    .eq('answer_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Author + subject for the reputation adjustment, needed on BOTH the vote and
  // un-vote paths so reputation goes back down when a vote is toggled off.
  const { data: answer } = await admin
    .from('community_answers')
    .select('author_id, community_questions(subject_code)')
    .eq('id', id)
    .maybeSingle()
  const subjectCode = (answer?.community_questions as { subject_code?: string } | null)?.subject_code
  const repTarget =
    answer?.author_id && answer.author_id !== user.id && subjectCode
      ? { authorId: answer.author_id as string, subjectCode }
      : null

  let voted: boolean
  if (existing) {
    await admin.from('community_answer_votes').delete().eq('answer_id', id).eq('user_id', user.id)
    voted = false
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: -UPVOTE_REP })
  } else {
    const { error } = await admin.from('community_answer_votes').insert({ answer_id: id, user_id: user.id })
    if (error) return jsonWithAuthCookies({ error: 'Could not vote.' }, pendingCookies, { status: 500 })
    voted = true
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: UPVOTE_REP })
  }
  const { data } = await admin.from('community_answers').select('vote_count').eq('id', id).maybeSingle()
  return jsonWithAuthCookies({ voted, voteCount: data?.vote_count ?? 0 }, pendingCookies)
}
