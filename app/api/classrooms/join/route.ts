import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { parseInviteCode } from '@/lib/teacher/invite-code'
import {
  JOIN_FAILURE_WINDOW_SECONDS,
  JoinGuardUnavailableError,
  checkJoinGuard,
  recordJoinFailure,
} from '@/lib/teacher/join-attempts'
import { clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: { invite_code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Charset-validated before it reaches the query: an unvalidated code fed into
  // the previous ILIKE meant `%` matched every classroom, so anyone could enrol
  // themselves into whichever one came back first.
  const inviteCode = parseInviteCode(body.invite_code)
  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Same per-address guard as by-code, and the same counter: guessing codes
  // through join instead of the preview must not be a way around it. Only a
  // miss counts (see lib/teacher/join-attempts.ts), so a class joining
  // together on one school IP is unaffected.
  const ip = clientIp(req)
  let guard
  try {
    guard = await checkJoinGuard(serviceClient, ip)
  } catch (err) {
    if (err instanceof JoinGuardUnavailableError) {
      return jsonWithAuthCookies(
        { error: 'Joining is temporarily unavailable. Try again in a minute.' },
        pendingCookies,
        { status: 503 }
      )
    }
    throw err
  }
  if (!guard.allowed) {
    return jsonWithAuthCookies({ error: guard.message }, pendingCookies, {
      status: 429,
      headers: { 'Retry-After': String(JOIN_FAILURE_WINDOW_SECONDS) },
    })
  }

  const { data: classroom } = await serviceClient
    .from('classrooms')
    .select('id, name, teacher_id')
    .eq('invite_code', inviteCode)
    .maybeSingle()

  if (!classroom) {
    await recordJoinFailure(serviceClient, ip)
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // A teacher joining their own class as a student would appear in their own
  // roster and skew every cohort figure derived from it.
  if (classroom.teacher_id === user.id) {
    return jsonWithAuthCookies(
      { error: 'This is your own classroom — share the code with your students.' },
      pendingCookies,
      { status: 400 }
    )
  }

  const { error } = await serviceClient
    .from('classroom_memberships')
    .insert({ classroom_id: classroom.id, student_id: user.id })

  if (error) {
    if (error.code === '23505') {
      return jsonWithAuthCookies(
        { success: true, message: 'Already enrolled', classroom: classroom.name },
        pendingCookies
      )
    }
    console.error('[classrooms/join] enrollment insert failed:', error)
    return NextResponse.json({ error: 'Could not join classroom' }, { status: 500 })
  }

  return jsonWithAuthCookies({ success: true, classroom: classroom.name }, pendingCookies)
}
