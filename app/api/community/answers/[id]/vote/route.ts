import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

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
  let voted: boolean
  if (existing) {
    await admin.from('community_answer_votes').delete().eq('answer_id', id).eq('user_id', user.id)
    voted = false
  } else {
    const { error } = await admin.from('community_answer_votes').insert({ answer_id: id, user_id: user.id })
    if (error) return jsonWithAuthCookies({ error: 'Could not vote.' }, pendingCookies, { status: 500 })
    voted = true
  }
  const { data } = await admin.from('community_answers').select('vote_count').eq('id', id).maybeSingle()
  return jsonWithAuthCookies({ voted, voteCount: data?.vote_count ?? 0 }, pendingCookies)
}
