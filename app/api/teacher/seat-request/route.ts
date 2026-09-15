import { NextResponse, type NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  checkContactRateLimit,
  clientIp,
  incrementContactRateLimit,
} from '@/lib/rate-limit'
import { HONEYPOT_FIELD, isHoneypotTripped } from '@/lib/honeypot'
import { rateLimitJson } from '@/lib/http/rate-limit-response'
import { notifyAdminTeacherSeatRequest } from '@/lib/email/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  school_name?: string
  school_email?: string
  school_country?: string
  role_title?: string
  class_size?: number | string
  company?: string
}

export async function POST(request: NextRequest) {
  // Not `createClient()` — this route is posted as JSON from a client island and
  // must resolve the caller through the same path every other authenticated
  // route uses, so the request is attributable to a real account. An anonymous
  // seat request is worthless: the seat is granted onto a user row.
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (isHoneypotTripped(body[HONEYPOT_FIELD])) {
    return NextResponse.json({ ok: true })
  }

  const schoolName = (body.school_name || '').trim().slice(0, 160)
  const schoolEmail = (body.school_email || '').trim().toLowerCase().slice(0, 160)
  const schoolCountry = (body.school_country || '').trim().slice(0, 80) || null
  const roleTitle = (body.role_title || '').trim().slice(0, 120) || null

  const sizeParsed =
    body.class_size === undefined || body.class_size === ''
      ? null
      : Number(body.class_size)
  const classSize =
    sizeParsed != null && Number.isInteger(sizeParsed) && sizeParsed > 0 && sizeParsed <= 2000
      ? sizeParsed
      : null

  if (schoolName.length < 2) {
    return NextResponse.json(
      { error: 'Please tell us which school you teach at.' },
      { status: 400 }
    )
  }
  if (!schoolEmail || !EMAIL_RE.test(schoolEmail)) {
    return NextResponse.json(
      { error: 'Please enter your school email address.' },
      { status: 400 }
    )
  }

  const admin = createServiceClient()
  const ip = clientIp(request)
  const rate = await checkContactRateLimit(admin, ip, user.id)
  if (!rate.allowed) {
    return rateLimitJson(rate.message)
  }

  // Already verified — say so rather than queueing a request that the reviewer
  // would open, read and discard. This is the common case for a teacher who
  // was granted a seat by hand during outreach and later finds the form.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('teacher_verified_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.teacher_verified_at) {
    return jsonWithAuthCookies(
      { ok: true, status: 'approved' },
      pendingCookies
    )
  }

  const { data: pending } = await admin
    .from('teacher_seat_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  // Resubmitting updates the open request instead of failing on the partial
  // unique index — a teacher correcting a typo in their school email should not
  // meet an error, and the reviewer wants the corrected version, not both.
  const row = {
    user_id: user.id,
    school_name: schoolName,
    school_email: schoolEmail,
    school_country: schoolCountry,
    role_title: roleTitle,
    class_size: classSize,
  }

  const { error } = pending
    ? await admin.from('teacher_seat_requests').update(row).eq('id', pending.id)
    : await admin.from('teacher_seat_requests').insert(row)

  if (error) {
    console.error('[teacher-seat-request]', error)
    return NextResponse.json(
      { error: 'Could not send your request. Please try again.' },
      { status: 500 }
    )
  }

  await incrementContactRateLimit(admin, ip, rate.count)

  notifyAdminTeacherSeatRequest({
    accountEmail: user.email ?? null,
    schoolName,
    schoolEmail,
    schoolCountry,
    roleTitle,
    classSize,
  })

  return jsonWithAuthCookies({ ok: true, status: 'pending' }, pendingCookies)
}
