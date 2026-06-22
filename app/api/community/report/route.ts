import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'

const FLAG_THRESHOLD = 2

/** POST /api/community/report { targetType, targetId, reason } — file a report. */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Sign in to report content.' }, pendingCookies, { status: 401 })
  }
  let body: { targetType?: string; targetId?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid request body.' }, pendingCookies, { status: 400 })
  }
  const targetType = body.targetType
  if (targetType !== 'note' && targetType !== 'question' && targetType !== 'answer') {
    return jsonWithAuthCookies({ error: 'Invalid target.' }, pendingCookies, { status: 400 })
  }
  if (!body.targetId || typeof body.targetId !== 'string') {
    return jsonWithAuthCookies({ error: 'Missing target.' }, pendingCookies, { status: 400 })
  }
  const reason = (body.reason || '').toString().trim().slice(0, 500)
  const admin = createServiceClient()

  // One report per user per target (idempotent).
  const { data: dup } = await admin
    .from('community_reports')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', body.targetId)
    .eq('reporter_id', user.id)
    .maybeSingle()
  if (!dup) {
    await admin.from('community_reports').insert({
      target_type: targetType,
      target_id: body.targetId,
      reporter_id: user.id,
      reason,
    })
  }

  // Auto-hide content once enough distinct open reports accumulate (admin reviews).
  const { count } = await admin
    .from('community_reports')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', body.targetId)
    .eq('status', 'open')
  if ((count ?? 0) >= FLAG_THRESHOLD) {
    if (targetType === 'note') {
      await admin
        .from('community_notes')
        .update({ status: 'flagged' })
        .eq('id', body.targetId)
        .eq('status', 'published')
    } else if (targetType === 'question') {
      await admin
        .from('community_questions')
        .update({ status: 'flagged' })
        .eq('id', body.targetId)
        .eq('status', 'published')
    } else if (targetType === 'answer') {
      await admin
        .from('community_answers')
        .update({ status: 'flagged' })
        .eq('id', body.targetId)
        .eq('status', 'published')
    }
  }
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
