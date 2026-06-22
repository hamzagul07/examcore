import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'

/** POST /api/community/admin { noteId, action: 'remove' | 'restore' } — moderator action. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden.' }, pendingCookies, { status: 403 })
  }
  let body: { noteId?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid body.' }, pendingCookies, { status: 400 })
  }
  if (!body.noteId || (body.action !== 'remove' && body.action !== 'restore')) {
    return jsonWithAuthCookies({ error: 'Invalid request.' }, pendingCookies, { status: 400 })
  }
  const status = body.action === 'remove' ? 'removed' : 'published'
  const admin = createServiceClient()
  const { error } = await admin.from('community_notes').update({ status, moderation_reason: null }).eq('id', body.noteId)
  if (error) {
    return jsonWithAuthCookies({ error: 'Could not update note.' }, pendingCookies, { status: 500 })
  }
  await admin
    .from('community_reports')
    .update({ status: 'reviewed' })
    .eq('target_type', 'note')
    .eq('target_id', body.noteId)
    .eq('status', 'open')
  return jsonWithAuthCookies({ ok: true, status }, pendingCookies)
}
