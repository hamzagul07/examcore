import type { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { parseFeedbackReadBody } from '@/lib/student/assignments'

export const dynamic = 'force-dynamic'

/**
 * POST `{ids}` → `{ok: true}` (docs/TEACHER_SYSTEM_SPEC.md §3).
 *
 * Marks the caller's own teacher notes as read. The write is the
 * `mark_teacher_feedback_read` RPC under the caller's session: it only sets
 * `read_at` on rows whose student is auth.uid() and that are still unread, so
 * an id belonging to someone else, or one already read, is a silent no-op.
 * No client role holds UPDATE on teacher_feedback (20260926c), which is why
 * this is not a plain update.
 */
export async function POST(req: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Unauthorized' }, pendingCookies, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON', field: 'ids' }, pendingCookies, { status: 400 })
  }
  const parsed = parseFeedbackReadBody(body)
  if (!parsed.ok) {
    return jsonWithAuthCookies({ error: parsed.error, field: parsed.field }, pendingCookies, { status: 400 })
  }

  const { error } = await supabase.rpc('mark_teacher_feedback_read', { p_ids: parsed.ids })
  if (error) {
    console.error('[api/feedback/read] rpc failed', { message: error.message })
    return jsonWithAuthCookies({ error: 'Could not update your notes. Try again.' }, pendingCookies, { status: 500 })
  }
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
