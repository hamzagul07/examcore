import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'

/** POST /api/community/admin { targetType, targetId, action: 'remove' | 'restore' } */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden.' }, pendingCookies, { status: 403 })
  }
  let body: { targetType?: string; targetId?: string; noteId?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid body.' }, pendingCookies, { status: 400 })
  }

  const targetType = body.targetType ?? (body.noteId ? 'note' : undefined)
  const targetId = body.targetId ?? body.noteId
  if (
    !targetId ||
    (targetType !== 'note' && targetType !== 'question' && targetType !== 'answer') ||
    (body.action !== 'remove' && body.action !== 'restore')
  ) {
    return jsonWithAuthCookies({ error: 'Invalid request.' }, pendingCookies, { status: 400 })
  }

  const status = body.action === 'remove' ? 'removed' : 'published'
  const admin = createServiceClient()
  const table =
    targetType === 'note'
      ? 'community_notes'
      : targetType === 'question'
        ? 'community_questions'
        : 'community_answers'

  const { error } = await admin
    .from(table)
    .update({ status, moderation_reason: null })
    .eq('id', targetId)
  if (error) {
    return jsonWithAuthCookies({ error: 'Could not update content.' }, pendingCookies, { status: 500 })
  }

  await admin
    .from('community_reports')
    .update({ status: 'reviewed' })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('status', 'open')

  return jsonWithAuthCookies({ ok: true, status, targetType }, pendingCookies)
}
