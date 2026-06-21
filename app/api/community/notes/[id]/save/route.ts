import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

/** POST /api/community/notes/[id]/save — toggle the signed-in user's save/bookmark. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to save notes.' }, pendingCookies, { status: 401 })
  }
  const { id } = await params
  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('community_note_saves')
    .select('note_id')
    .eq('note_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  let saved: boolean
  if (existing) {
    await admin.from('community_note_saves').delete().eq('note_id', id).eq('user_id', user.id)
    saved = false
  } else {
    const { error } = await admin.from('community_note_saves').insert({ note_id: id, user_id: user.id })
    if (error) {
      return jsonWithAuthCookies({ error: 'Could not save this note.' }, pendingCookies, { status: 500 })
    }
    saved = true
  }
  const { data: note } = await admin
    .from('community_notes')
    .select('save_count')
    .eq('id', id)
    .maybeSingle()
  return jsonWithAuthCookies({ saved, saveCount: note?.save_count ?? 0 }, pendingCookies)
}
