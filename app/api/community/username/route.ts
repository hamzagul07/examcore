import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { validateUsername } from '@/lib/community/username'

/** GET /api/community/username?u=foo — is the username valid + available? */
export async function GET(request: NextRequest) {
  const u = new URL(request.url).searchParams.get('u') || ''
  const check = validateUsername(u)
  if (!check.ok) return Response.json({ available: false, error: check.error })
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id')
    .eq('username', check.username)
    .maybeSingle()
  return Response.json({ available: !data, username: check.username })
}

/** POST /api/community/username { username } — set the signed-in user's @username. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to choose a username.' }, pendingCookies, { status: 401 })
  }
  let body: { username?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  const check = validateUsername(body.username || '')
  if (!check.ok) {
    return jsonWithAuthCookies({ error: check.error }, pendingCookies, { status: 400 })
  }
  const admin = createServiceClient()
  const { data: taken } = await admin
    .from('user_profiles')
    .select('id')
    .eq('username', check.username)
    .neq('id', user.id)
    .maybeSingle()
  if (taken) {
    return jsonWithAuthCookies({ error: 'That username is taken — try another.' }, pendingCookies, { status: 409 })
  }
  const { error } = await admin
    .from('user_profiles')
    .upsert({ id: user.id, username: check.username, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) {
    console.error('[community/username] upsert failed:', error)
    return jsonWithAuthCookies({ error: 'Could not save your username.' }, pendingCookies, { status: 500 })
  }
  return jsonWithAuthCookies({ ok: true, username: check.username }, pendingCookies)
}
