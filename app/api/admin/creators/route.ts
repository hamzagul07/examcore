import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { grantCreatorSeat } from '@/lib/creators/grant'
import { sendCreatorSeatApprovedEmail } from '@/lib/email/creator-seat'

type Body = {
  action?: 'approve' | 'decline' | 'pause' | 'resume'
  applicationId?: string
  userId?: string
  code?: string
  giftMarks?: number
  giftPoolMonthly?: number
  isAdult?: boolean
  reason?: string
}

/** Admin actions on creator applications and seats (docs/CREATORS_PROGRAM.md). */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!isAdminUser(user)) {
    return jsonWithAuthCookies({ error: 'Forbidden' }, pendingCookies, { status: 403 })
  }
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON body' }, pendingCookies, { status: 400 })
  }
  const admin = createServiceClient()
  const now = new Date().toISOString()

  if (body.action === 'pause' || body.action === 'resume') {
    if (!body.userId) return jsonWithAuthCookies({ error: 'userId required' }, pendingCookies, { status: 400 })
    const { error } = await admin
      .from('creators')
      .update({ status: body.action === 'pause' ? 'paused' : 'active', updated_at: now })
      .eq('user_id', body.userId)
    if (error) return jsonWithAuthCookies({ error: error.message }, pendingCookies, { status: 500 })
    return jsonWithAuthCookies({ ok: true }, pendingCookies)
  }

  if (!body.applicationId) {
    return jsonWithAuthCookies({ error: 'applicationId required' }, pendingCookies, { status: 400 })
  }
  const { data: app } = await admin
    .from('creator_applications')
    .select('*')
    .eq('id', body.applicationId)
    .maybeSingle()
  if (!app) return jsonWithAuthCookies({ error: 'Application not found' }, pendingCookies, { status: 404 })
  if (app.status !== 'pending') {
    return jsonWithAuthCookies({ error: `Already ${app.status}` }, pendingCookies, { status: 409 })
  }

  if (body.action === 'decline') {
    const { error } = await admin
      .from('creator_applications')
      .update({ status: 'declined', reviewed_reason: body.reason?.trim() || null, reviewed_at: now })
      .eq('id', app.id)
    if (error) return jsonWithAuthCookies({ error: error.message }, pendingCookies, { status: 500 })
    return jsonWithAuthCookies({ ok: true }, pendingCookies)
  }

  if (body.action === 'approve') {
    const granted = await grantCreatorSeat({
      userId: app.user_id as string,
      code: body.code ?? '',
      handle: app.handle_wanted as string,
      displayName: app.display_name as string,
      tagline: (app.tagline as string | null) ?? null,
      links: {
        tiktok: app.tiktok as string | null,
        instagram: app.instagram as string | null,
        youtube: app.youtube as string | null,
      },
      // The reviewer decides; the application's own claim is not evidence.
      isAdult: body.isAdult === true,
      giftMarks: body.giftMarks,
      giftPoolMonthly: body.giftPoolMonthly,
      reason: body.reason?.trim() || `application ${app.id}`,
    })
    if (!granted.ok) return jsonWithAuthCookies({ error: granted.error }, pendingCookies, { status: 400 })
    await admin
      .from('creator_applications')
      .update({ status: 'approved', reviewed_reason: body.reason?.trim() || null, reviewed_at: now })
      .eq('id', app.id)
    const { data: authData } = await admin.auth.admin.getUserById(app.user_id as string)
    const email = authData?.user?.email
    if (email) {
      await sendCreatorSeatApprovedEmail({
        email,
        handle: granted.handle,
        code: granted.code,
        giftMarks: Math.round(body.giftMarks ?? 5),
      })
    }
    return jsonWithAuthCookies({ ok: true, handle: granted.handle, code: granted.code }, pendingCookies)
  }

  return jsonWithAuthCookies({ error: 'Unknown action' }, pendingCookies, { status: 400 })
}
