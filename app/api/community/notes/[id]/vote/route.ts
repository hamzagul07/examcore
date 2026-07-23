import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { adjustAuthorSubjectRep, UPVOTE_REP } from '@/lib/community/vote-rep'

/** POST /api/community/notes/[id]/vote — toggle the signed-in user's upvote. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to vote.' }, pendingCookies, { status: 401 })
  }
  const { id } = await params
  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('community_note_votes')
    .select('note_id')
    .eq('note_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Needed on both the vote and un-vote paths so reputation reverses on toggle-off.
  const { data: note } = await admin
    .from('community_notes')
    .select('author_id, subject_code')
    .eq('id', id)
    .maybeSingle()
  const repTarget =
    note?.author_id && note.author_id !== user.id && note.subject_code
      ? { authorId: note.author_id as string, subjectCode: note.subject_code as string }
      : null

  let voted: boolean
  if (existing) {
    await admin.from('community_note_votes').delete().eq('note_id', id).eq('user_id', user.id)
    voted = false
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: -UPVOTE_REP })
  } else {
    const { error } = await admin.from('community_note_votes').insert({ note_id: id, user_id: user.id })
    if (error) {
      return jsonWithAuthCookies({ error: 'Could not record your vote.' }, pendingCookies, { status: 500 })
    }
    voted = true
    if (repTarget) await adjustAuthorSubjectRep(admin, { ...repTarget, delta: UPVOTE_REP })
  }
  const { data: noteCount } = await admin
    .from('community_notes')
    .select('upvote_count')
    .eq('id', id)
    .maybeSingle()
  return jsonWithAuthCookies({ voted, upvoteCount: noteCount?.upvote_count ?? 0 }, pendingCookies)
}
