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
  const admin = createServiceClient()
  const { data } = await admin
    .from('notifications')
    .select('id, type, title, href, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const notifications = data ?? []
  const unread = notifications.filter((n) => !n.read).length
  return jsonWithAuthCookies({ notifications, unread }, pendingCookies)
}

/** POST — mark all notifications read. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ ok: false }, pendingCookies, { status: 401 })
  const admin = createServiceClient()
  await admin.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
