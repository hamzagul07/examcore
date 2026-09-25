import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyAuthCookies,
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { rateLimitJson, rateLimitUnavailableJson } from '@/lib/http/rate-limit-response'
import {
  RateLimitUnavailableError,
  clientIp,
  consumeInviteLookupSlot,
  refundInviteLookupSlot,
  type InviteLookupScope,
} from '@/lib/rate-limit'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { parseInviteCode } from '@/lib/teacher/invite-code'

export const dynamic = 'force-dynamic'

const UNAVAILABLE = 'Joining is temporarily unavailable. Try again in a minute.'

type Membership = { status: string }

async function readMembership(admin: SupabaseClient, classroomId: string, userId: string) {
  return admin
    .from('classroom_memberships')
    .select('status')
    .eq('classroom_id', classroomId)
    .eq('student_id', userId)
    .maybeSingle<Membership>()
}

/**
 * POST `{invite_code}` → `{success, classroom, classroom_id, rejoined, next}`
 * (docs/TEACHER_SYSTEM_SPEC.md §3).
 *
 * Two `invite_lookup_count` buckets are spent before the code is looked up
 * (lib/rate-limit.ts):
 *
 *   - the caller's own join bucket (DAILY_INVITE_JOIN_LIMIT a day), kept
 *     whatever happens — nobody joins twenty classes in a day, and it bounds
 *     join/leave churn on a teacher's roster;
 *   - the address's miss bucket, the same one the preview spends, given back
 *     as soon as the code turns out to be real. Guessing codes through join
 *     instead of the preview must not be a way around the preview's guard,
 *     and several accounts on one address share it.
 *
 * Either bucket being unavailable is a 503 (fail closed, spec §8). Slots are
 * refunded only when the failure is ours (a database error), never for a
 * wrong code.
 *
 * Membership rules (memberships are written only by the service role, after
 * this route has decided the caller may join):
 *   - no row        → insert an active membership (joined_at = now);
 *   - `active`      → already enrolled, success;
 *   - `left`        → re-activated with joined_at = now, so the teacher's
 *                     since-join scoping starts again from today and the gap
 *                     stays private;
 *   - `removed`     → 409 'Removed by teacher': only the teacher can undo it;
 *   - own class     → 400: a teacher on their own roster would skew every
 *                     cohort figure;
 *   - archived      → 410.
 */
export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })
  }

  let body: { invite_code?: unknown }
  try {
    body = (await req.json()) as { invite_code?: unknown }
  } catch {
    return jsonWithAuthCookies({ error: 'Invalid JSON', field: 'invite_code' }, pendingCookies, { status: 400 })
  }

  // Charset-validated before it reaches the query: the previous ILIKE meant
  // `%` matched every classroom, so anyone could enrol in whichever came back.
  const inviteCode = parseInviteCode(body?.invite_code)
  if (!inviteCode) {
    return jsonWithAuthCookies({ error: 'Invite code is required', field: 'invite_code' }, pendingCookies, {
      status: 400,
    })
  }

  let admin: SupabaseClient
  try {
    admin = createServiceClient()
  } catch {
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }

  const userScope: InviteLookupScope = { userId: user.id }
  const ipScope: InviteLookupScope = { ip: clientIp(req) }
  // Which slots this request holds, so each is given back at most once — a
  // second refund would mint a slot the caller never spent.
  const held = { user: false, ip: false }
  const release = async (which: 'user' | 'ip') => {
    if (!held[which]) return
    held[which] = false
    await refundInviteLookupSlot(admin, which === 'user' ? userScope : ipScope)
  }

  try {
    const perAccount = await consumeInviteLookupSlot(admin, userScope)
    if (!perAccount.allowed) return applyAuthCookies(rateLimitJson(perAccount.message), pendingCookies)
    held.user = true
    const perAddress = await consumeInviteLookupSlot(admin, ipScope)
    if (!perAddress.allowed) {
      // Nothing was attempted, so the caller's own join slot is not spent.
      await release('user')
      return applyAuthCookies(rateLimitJson(perAddress.message), pendingCookies)
    }
    held.ip = true
  } catch (err) {
    if (!(err instanceof RateLimitUnavailableError)) console.error('[classrooms/join] rate limit threw', err)
    await release('user')
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }

  const ourFailure = async (context: string, message: string) => {
    console.error(`[classrooms/join] ${context}`, { message })
    await Promise.all([release('user'), release('ip')])
    return jsonWithAuthCookies({ error: 'Could not join the class. Try again.' }, pendingCookies, { status: 500 })
  }

  const { data: classroom, error: lookupError } = await admin
    .from('classrooms')
    .select('id, name, teacher_id, archived_at')
    .eq('invite_code', inviteCode)
    .maybeSingle<{ id: string; name: string; teacher_id: string; archived_at: string | null }>()
  if (lookupError) return ourFailure('lookup failed', lookupError.message)

  if (!classroom) {
    // A miss: both slots stay spent.
    return jsonWithAuthCookies({ error: 'Invalid invite code. Check with your teacher.' }, pendingCookies, {
      status: 404,
    })
  }
  // A real code was not a guess.
  await release('ip')

  if (classroom.archived_at) {
    return jsonWithAuthCookies({ error: 'This class has been archived. Ask your teacher for a new code.' }, pendingCookies, {
      status: 410,
    })
  }
  if (classroom.teacher_id === user.id) {
    return jsonWithAuthCookies(
      { error: 'This is your own classroom — share the code with your students.' },
      pendingCookies,
      { status: 400 }
    )
  }

  const next = isTeacherV2() ? '/dashboard/assignments' : '/dashboard'
  const joined = (rejoined: boolean, already = false) =>
    jsonWithAuthCookies(
      {
        success: true,
        ...(already ? { message: 'Already enrolled' } : {}),
        classroom: classroom.name,
        classroom_id: classroom.id,
        rejoined,
        next,
      },
      pendingCookies
    )
  const removed = () =>
    jsonWithAuthCookies({ error: 'Removed by teacher' }, pendingCookies, { status: 409 })

  const { data: existing, error: readError } = await readMembership(admin, classroom.id, user.id)
  if (readError) return ourFailure('membership read failed', readError.message)

  if (!existing) {
    const { error: insertError } = await admin
      .from('classroom_memberships')
      .insert({ classroom_id: classroom.id, student_id: user.id, status: 'active' })
    if (!insertError) return joined(false)
    if (insertError.code !== '23505') return ourFailure('enrolment insert failed', insertError.message)
    // A second tab won the race: fall through to whatever it wrote.
    const { data: raced, error: racedError } = await readMembership(admin, classroom.id, user.id)
    if (racedError || !raced) return ourFailure('membership re-read failed', racedError?.message ?? 'no row')
    return raced.status === 'removed' ? removed() : joined(false, true)
  }

  if (existing.status === 'active') return joined(false, true)
  if (existing.status === 'removed') return removed()

  // `left`: come back from today. Conditional on still being `left`, so a
  // teacher's removal landing in between is not overwritten.
  const { data: reactivated, error: updateError } = await admin
    .from('classroom_memberships')
    .update({ status: 'active', joined_at: new Date().toISOString(), left_at: null })
    .eq('classroom_id', classroom.id)
    .eq('student_id', user.id)
    .eq('status', 'left')
    .select('status')
  if (updateError) return ourFailure('rejoin failed', updateError.message)
  if (reactivated && reactivated.length > 0) return joined(true)

  // Someone else changed the row between the read and the update.
  const { data: current, error: currentError } = await readMembership(admin, classroom.id, user.id)
  if (currentError || !current) return ourFailure('membership re-read failed', currentError?.message ?? 'no row')
  return current.status === 'active' ? joined(false, true) : removed()
}
