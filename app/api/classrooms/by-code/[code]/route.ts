import type { NextRequest } from 'next/server'
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
} from '@/lib/rate-limit'
import { classroomSubjectLabel } from '@/lib/student/assignments'
import type { InvitePreview } from '@/lib/student/join'
import { displayName } from '@/lib/teacher/display-name'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { parseInviteCode } from '@/lib/teacher/invite-code'

export const dynamic = 'force-dynamic'

const UNAVAILABLE = 'Invite lookup is temporarily unavailable. Try again in a minute.'
const NOT_FOUND = 'Invalid invite code. Check with your teacher.'

/**
 * Preview a classroom by invite code, for the join page
 * (docs/TEACHER_SYSTEM_SPEC.md §3, §8 enumeration).
 *
 * Signed-in only (code review 2026-09-25, §2 Teacher — this was an anonymous
 * classroom-name oracle), and metered on the `invite_lookup_count` bucket per
 * address. The slot is taken BEFORE the lookup, so a burst of parallel guesses
 * cannot all pass, and handed back when the code is real, so what stays spent
 * is the misses — a whole school joining classes on one NAT address costs
 * nothing (lib/rate-limit.ts, DAILY_INVITE_LOOKUP_MISS_LIMIT). The bucket
 * failing closed (503) when the counter is unavailable is deliberate (§8).
 *
 * Order: malformed codes are refused before the bucket (they never reach the
 * database and cannot be a guess at a real code), the bucket before the
 * lookup, and an unknown code is a 404 whose slot stays spent.
 *
 * The response is what a student needs to decide — the class, its subject, the
 * teacher's first name and initial, how many are in it, and whether they are
 * already a member. Never another student's name, never the teacher's id or
 * email, never the code itself.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies(
      { classroom: null, error: 'Sign in to view this invitation.' },
      pendingCookies,
      { status: 401 }
    )
  }

  const { code: rawCode } = await params
  // Validated against a strict charset before it can reach the query (the old
  // ILIKE made `/join/%` a wildcard that matched every classroom).
  const code = parseInviteCode(rawCode)
  if (!code) {
    return jsonWithAuthCookies({ classroom: null, error: NOT_FOUND }, pendingCookies, { status: 404 })
  }

  let admin
  try {
    admin = createServiceClient()
  } catch {
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }

  const scope = { ip: clientIp(req) }
  try {
    const slot = await consumeInviteLookupSlot(admin, scope)
    if (!slot.allowed) return applyAuthCookies(rateLimitJson(slot.message), pendingCookies)
  } catch (err) {
    if (!(err instanceof RateLimitUnavailableError)) {
      console.error('[classrooms/by-code] rate limit threw', err)
    }
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }

  const { data: classroom, error } = await admin
    .from('classrooms')
    .select('id, name, description, subject, subject_code, level, teacher_id, archived_at')
    .eq('invite_code', code)
    .maybeSingle()

  if (error) {
    // Our failure, not the caller's guess: give the slot back.
    await refundInviteLookupSlot(admin, scope)
    console.error('[classrooms/by-code] lookup failed', { message: error.message })
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }
  if (!classroom) {
    // A well-formed code that matches nothing is what enumeration is made of;
    // its slot stays spent.
    return jsonWithAuthCookies({ classroom: null, error: NOT_FOUND }, pendingCookies, { status: 404 })
  }

  // A real code: this lookup was not a guess.
  await refundInviteLookupSlot(admin, scope)

  if (classroom.archived_at) {
    return jsonWithAuthCookies(
      { classroom: null, error: 'This class has been archived. Ask your teacher for a new code.' },
      pendingCookies,
      { status: 410 }
    )
  }

  const [countRes, ownRes, teacherRes] = await Promise.all([
    admin
      .from('classroom_memberships')
      .select('student_id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id)
      .eq('status', 'active'),
    admin
      .from('classroom_memberships')
      .select('status')
      .eq('classroom_id', classroom.id)
      .eq('student_id', user.id)
      .maybeSingle(),
    admin.from('user_profiles').select('full_name').eq('id', classroom.teacher_id).maybeSingle(),
  ])
  const readError = ownRes.error ?? countRes.error
  if (readError) {
    console.error('[classrooms/by-code] membership read failed', { message: readError.message })
    return applyAuthCookies(rateLimitUnavailableJson(UNAVAILABLE), pendingCookies)
  }
  // The teacher's name is a courtesy; without it the card says "Your teacher".
  if (teacherRes.error) console.warn('[classrooms/by-code] teacher name unavailable', { message: teacherRes.error.message })

  const status = (ownRes.data as { status?: string } | null)?.status
  const preview: InvitePreview = {
    name: classroom.name,
    description: typeof classroom.description === 'string' && classroom.description.trim() ? classroom.description : null,
    subject_label: classroomSubjectLabel(classroom),
    level: typeof classroom.level === 'string' && classroom.level.trim() ? classroom.level : null,
    teacher_display_name: displayName(
      (teacherRes.data as { full_name?: string | null } | null)?.full_name ?? null,
      'Your teacher'
    ),
    student_count: countRes.count ?? 0,
    membership: status === 'active' || status === 'left' || status === 'removed' ? status : 'none',
    own_class: classroom.teacher_id === user.id,
  }

  // Where the student lands after joining (the sets list is dark without v2).
  const next = isTeacherV2() ? '/dashboard/assignments' : '/dashboard'
  return jsonWithAuthCookies({ classroom: preview, next }, pendingCookies, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
