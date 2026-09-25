import { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import { parseInviteCode } from '@/lib/teacher/invite-code'
import {
  JOIN_FAILURE_WINDOW_SECONDS,
  JoinGuardUnavailableError,
  checkJoinGuard,
  recordJoinFailure,
} from '@/lib/teacher/join-attempts'
import { clientIp } from '@/lib/rate-limit'

/**
 * Preview a classroom by invite code, for the join page.
 *
 * Signed-in only, and bounded per address. This used to be anonymous with no
 * limit and returned the class name, subject and roster size, so a script
 * walking the code space could catalogue every classroom on the platform and
 * pick which to join (code review 2026-09-25, §2 Teacher). Joining already
 * needs an account, so nothing a student can do is lost by asking for one a
 * step earlier; a signed-out visitor is told to sign in rather than shown a
 * preview.
 *
 * Order matters: malformed codes are refused before the guard (they never
 * reach the database and cannot be a guess at a real code), the guard runs
 * before the lookup, and an unknown code is a 404 that counts as a miss.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies(
      { classroom: null, error: 'Sign in to view this invitation.' },
      pendingCookies,
      { status: 401 }
    )
  }

  const { code: rawCode } = await params
  // Validated against a strict charset before it can reach the query. This used
  // to be a bare `.trim()` fed into ILIKE, which made `/join/%` a wildcard that
  // matched every classroom and returned one of them to an anonymous caller.
  const code = parseInviteCode(rawCode)

  if (!code) {
    return jsonWithAuthCookies(
      { classroom: null, error: 'Invalid invite code. Check with your teacher.' },
      pendingCookies,
      { status: 404 }
    )
  }

  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    return jsonWithAuthCookies(
      { error: 'Invite lookup is temporarily unavailable' },
      pendingCookies,
      { status: 503 }
    )
  }

  const ip = clientIp(req)
  let guard
  try {
    guard = await checkJoinGuard(supabase, ip)
  } catch (err) {
    if (err instanceof JoinGuardUnavailableError) {
      return jsonWithAuthCookies(
        { error: 'Invite lookup is temporarily unavailable' },
        pendingCookies,
        { status: 503 }
      )
    }
    throw err
  }
  if (!guard.allowed) {
    return jsonWithAuthCookies({ classroom: null, error: guard.message }, pendingCookies, {
      status: 429,
      headers: { 'Retry-After': String(JOIN_FAILURE_WINDOW_SECONDS) },
    })
  }

  // `teacher_id` is deliberately not selected: this endpoint's only job is to
  // show a student what they are about to join.
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, description, board, level, subject, invite_code')
    .eq('invite_code', code)
    .maybeSingle()

  if (error) {
    console.error('[classrooms/by-code] lookup failed:', error)
    return jsonWithAuthCookies(
      { error: 'Invite lookup is temporarily unavailable' },
      pendingCookies,
      { status: 503 }
    )
  }

  if (!data) {
    // A well-formed code that matches nothing is exactly what enumeration
    // produces; it is what the guard counts.
    await recordJoinFailure(supabase, ip)
    return jsonWithAuthCookies(
      { classroom: null, error: 'Invalid invite code. Check with your teacher.' },
      pendingCookies,
      { status: 404 }
    )
  }

  const { count } = await supabase
    .from('classroom_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', data.id)

  return jsonWithAuthCookies(
    { classroom: { ...data, studentCount: count || 0 } },
    pendingCookies
  )
}
