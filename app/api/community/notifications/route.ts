import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

/** GET — recent notifications + unread count for the signed-in user. */
export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ notifications: [], unread: 0 }, pendingCookies)

  const sp = request.nextUrl.searchParams
  const offset = Math.max(0, Number.parseInt(sp.get('offset') || '0', 10) || 0)
  const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get('limit') || '25', 10) || 25))

  const admin = createServiceClient()
  const [{ data }, { count: unreadCount }] = await Promise.all([
    admin
      .from('notifications')
      .select('id, type, title, body, href, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  return jsonWithAuthCookies(
    { notifications: data ?? [], unread: unreadCount ?? 0 },
    pendingCookies
  )
}

/** POST — mark all notifications read. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ ok: false }, pendingCookies, { status: 401 })
  const admin = createServiceClient()
  await admin.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}

/** PATCH — mark one notification read { id }. */
export async function PATCH(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ ok: false }, pendingCookies, { status: 401 })

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON' }, pendingCookies, { status: 400 })
  }

  if (!body.id) {
    return jsonWithAuthCookies({ error: 'Missing id' }, pendingCookies, { status: 400 })
  }

  const admin = createServiceClient()
  await admin
    .from('notifications')
    .update({ read: true })
    .eq('id', body.id)
    .eq('user_id', user.id)

  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
