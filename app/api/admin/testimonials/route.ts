import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import {
  authenticateRouteRequest,
  jsonWithAuthCookies,
  createServiceClient,
} from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'

/**
 * Approve or unapprove a student quote for the public homepage.
 *
 * `approved_at` is deliberately writable from nowhere else: end-user roles hold
 * no write grant on `mark_feedback` at all (see 20260722_mark_feedback_lockdown),
 * because the original RLS policies let any signed-in user self-approve a quote
 * straight onto the marketing site. This admin-gated route is the only path.
 *
 * POST { id, action: 'approve' | 'unapprove' }
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden.' }, pendingCookies, { status: 403 })
  }

  let body: { id?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid body.' }, pendingCookies, { status: 400 })
  }

  const { id, action } = body
  if (!id || (action !== 'approve' && action !== 'unapprove')) {
    return jsonWithAuthCookies({ error: 'Invalid request.' }, pendingCookies, { status: 400 })
  }

  const admin = createServiceClient()

  if (action === 'approve') {
    // Re-check consent at approval time rather than trusting the queue the
    // admin was looking at: the student may have revised their feedback (which
    // clears consent) between the page render and this click.
    const { data: row } = await admin
      .from('mark_feedback')
      .select('share_consent, rating, comment')
      .eq('id', id)
      .maybeSingle()

    if (!row?.share_consent) {
      return jsonWithAuthCookies(
        { error: 'This student has not consented to sharing.' },
        pendingCookies,
        { status: 409 }
      )
    }
    if (row.rating !== 'up' || !row.comment?.trim()) {
      return jsonWithAuthCookies(
        { error: 'Only positive feedback with a comment can be published.' },
        pendingCookies,
        { status: 409 }
      )
    }
  }

  const { error } = await admin
    .from('mark_feedback')
    .update({ approved_at: action === 'approve' ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) {
    console.error('[admin/testimonials] update failed:', error.message)
    return jsonWithAuthCookies({ error: 'Update failed.' }, pendingCookies, { status: 500 })
  }

  revalidateTag('testimonials', 'max')
  return jsonWithAuthCookies({ ok: true }, pendingCookies, { status: 200 })
}
