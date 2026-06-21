import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

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

  let voted: boolean
  if (existing) {
    await admin.from('community_note_votes').delete().eq('note_id', id).eq('user_id', user.id)
    voted = false
  } else {
    const { error } = await admin.from('community_note_votes').insert({ note_id: id, user_id: user.id })
    if (error) {
      return jsonWithAuthCookies({ error: 'Could not record your vote.' }, pendingCookies, { status: 500 })
    }
    voted = true
  }
  const { data: note } = await admin
    .from('community_notes')
    .select('upvote_count')
    .eq('id', id)
    .maybeSingle()
  return jsonWithAuthCookies({ voted, upvoteCount: note?.upvote_count ?? 0 }, pendingCookies)
}
