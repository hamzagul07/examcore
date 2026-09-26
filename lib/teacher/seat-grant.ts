import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { plainText, isUuid } from '@/lib/teacher/list-classrooms'

/**
 * Working the teacher seat queue — shared by /admin/teacher-seats, its API
 * route and `pnpm teacher:grant` (docs/TEACHER_SYSTEM_SPEC.md §3, §4, §5).
 *
 * A seat is `user_profiles.teacher_verified_at`: it carries the free teacher
 * allowance and, through student_in_verified_classroom(), the class bonus for
 * every student in that teacher's classes, so it is worth real money and is
 * never self-claimed. Requests sit in `teacher_seat_requests` (service-role
 * only; supabase/migrations/20260906_teacher_seat_requests.sql) until a human
 * approves or declines one here.
 *
 * Every function that writes takes the service client. The pure pieces —
 * body parsing, the decision plan, the desk card state — are what
 * seat-grant.test.ts covers; the I/O functions only execute a plan.
 */

export type SeatRequestStatus = 'pending' | 'approved' | 'declined'
export type SeatDecision = 'approve' | 'decline'

export type SeatRequestRow = {
  id: string
  user_id: string
  school_name: string
  school_email: string
  school_country: string | null
  role_title: string | null
  class_size: number | null
  status: SeatRequestStatus
  reviewed_reason: string | null
  reviewed_at: string | null
  created_at: string
}

export const SEAT_REQUEST_COLUMNS =
  'id, user_id, school_name, school_email, school_country, role_title, class_size, status, reviewed_reason, reviewed_at, created_at'

/** Long enough for "Please apply with your school address, e.g. name@school.edu.pk". */
export const SEAT_REASON_MAX = 500
/** A decline must say something the teacher can act on; three characters rules out "no". */
export const DECLINE_REASON_MIN = 8

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type SeatDecisionInput = { requestId: string; action: SeatDecision; reason: string }

/**
 * POST /api/admin/teacher-seats body → a decision. The reason is plain text
 * (it is shown to the teacher on their desk and in an email) and required for
 * a decline, because a decline with no reason leaves the teacher nothing to
 * fix. An approval may leave it blank; approvalReason() fills in the school.
 */
export function parseSeatDecisionBody(
  body: unknown
): { ok: true; decision: SeatDecisionInput } | { ok: false; error: string; field?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Send a JSON object.' }
  }
  const b = body as Record<string, unknown>
  if (!isUuid(b.request_id)) return { ok: false, error: 'Unknown request.', field: 'request_id' }
  if (b.action !== 'approve' && b.action !== 'decline') {
    return { ok: false, error: 'Choose approve or decline.', field: 'action' }
  }
  const reason = b.reason === undefined || b.reason === null ? '' : plainText(b.reason, { multiline: true })
  if (reason === null) return { ok: false, error: 'The reason must be text.', field: 'reason' }
  if (reason.length > SEAT_REASON_MAX) {
    return { ok: false, error: `Keep the reason under ${SEAT_REASON_MAX} characters.`, field: 'reason' }
  }
  if (b.action === 'decline' && reason.length < DECLINE_REASON_MIN) {
    return {
      ok: false,
      error: 'Say why — the teacher sees this reason and needs to know what to fix.',
      field: 'reason',
    }
  }
  return { ok: true, decision: { requestId: (b.request_id as string).toLowerCase(), action: b.action, reason } }
}

/** GET ?status= → a status, defaulting to the queue. */
export function parseSeatStatus(raw: string | null): SeatRequestStatus | null {
  if (raw === null || raw === '' || raw === 'pending') return 'pending'
  if (raw === 'approved' || raw === 'declined') return raw
  return null
}

// ---------------------------------------------------------------------------
// The decision plan
// ---------------------------------------------------------------------------

/**
 * The audit reason recorded on an approval. The school the teacher gave is
 * the evidence, so it becomes the reason when the reviewer types none —
 * never an empty string, which is what made the reason mandatory on the
 * manual grant path in the first place.
 */
export function approvalReason(
  request: Pick<SeatRequestRow, 'school_name' | 'school_email'>,
  typed: string
): string {
  const reason = typed.trim()
  return reason || `request: ${request.school_name} (${request.school_email})`
}

export type SeatDecisionPlan = {
  /** Conditional update of the request row (only while it is still pending). */
  close: { status: 'approved' | 'declined'; reviewed_reason: string }
  /** The seat to write onto user_profiles, or null for a decline. */
  grant: { teacher_verified_reason: string } | null
  /** The in-app notification (type seat_decision). */
  notification: { type: 'seat_decision'; title: string; href: string }
  /** Which email to send the account holder. */
  email: 'approved' | 'declined'
}

/**
 * What approving or declining a request writes, as data. A request that is no
 * longer pending cannot be decided again — two reviewers working the same
 * queue must not grant a seat the other just declined.
 */
export function planSeatDecision(
  request: Pick<SeatRequestRow, 'status' | 'school_name' | 'school_email'>,
  decision: Pick<SeatDecisionInput, 'action' | 'reason'>,
  opts: { teacherCap: number }
): { ok: true; plan: SeatDecisionPlan } | { ok: false; error: string } {
  if (request.status !== 'pending') {
    return { ok: false, error: `This request was already ${request.status}.` }
  }
  if (decision.action === 'approve') {
    const reason = approvalReason(request, decision.reason)
    return {
      ok: true,
      plan: {
        close: { status: 'approved', reviewed_reason: reason },
        grant: { teacher_verified_reason: reason },
        notification: {
          type: 'seat_decision',
          title: `Your teacher seat is on — ${opts.teacherCap} marks a month, free`,
          href: '/teacher/dashboard',
        },
        email: 'approved',
      },
    }
  }
  const reason = decision.reason.trim()
  if (reason.length < DECLINE_REASON_MIN) {
    return { ok: false, error: 'A decline needs a reason the teacher can act on.' }
  }
  return {
    ok: true,
    plan: {
      close: { status: 'declined', reviewed_reason: reason },
      grant: null,
      notification: {
        type: 'seat_decision',
        title: "Your teacher seat request wasn't approved — see why on your desk",
        href: '/teacher/dashboard',
      },
      email: 'declined',
    },
  }
}

// ---------------------------------------------------------------------------
// The desk card
// ---------------------------------------------------------------------------

export type SeatCardState =
  | { kind: 'hidden' }
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'declined'; reason: string | null; reviewedAt: string | null }

/**
 * Which seat card the desk shows. Verified teachers see nothing (the steady
 * state). Otherwise the latest request decides: pending → "we're checking",
 * declined → the reviewer's reason and "Apply again", none or an approved
 * request whose seat was later revoked → the ask.
 */
export function seatCardState(input: {
  verifiedAt: string | null
  latest: Pick<SeatRequestRow, 'status' | 'reviewed_reason' | 'reviewed_at'> | null
}): SeatCardState {
  if (input.verifiedAt) return { kind: 'hidden' }
  if (!input.latest) return { kind: 'none' }
  if (input.latest.status === 'pending') return { kind: 'pending' }
  if (input.latest.status === 'declined') {
    return { kind: 'declined', reason: input.latest.reviewed_reason, reviewedAt: input.latest.reviewed_at }
  }
  return { kind: 'none' }
}

// ---------------------------------------------------------------------------
// I/O (service client)
// ---------------------------------------------------------------------------

/** The teacher's seat and their most recent request, for the desk card. */
export async function loadSeatState(
  admin: SupabaseClient,
  userId: string
): Promise<{ verifiedAt: string | null; latest: SeatRequestRow | null }> {
  const [{ data: profile }, { data: latest }] = await Promise.all([
    admin.from('user_profiles').select('teacher_verified_at').eq('id', userId).maybeSingle(),
    admin
      .from('teacher_seat_requests')
      .select(SEAT_REQUEST_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    verifiedAt: (profile?.teacher_verified_at as string | null | undefined) ?? null,
    latest: (latest as SeatRequestRow | null) ?? null,
  }
}

export type SeatQueueEntry = SeatRequestRow & { account_email: string | null }

/**
 * One page of requests by status. The queue (pending) reads oldest first — a
 * teacher waiting three days is the one to answer — and history newest first.
 * Keyset-paginated on (created_at, id).
 */
export async function listSeatRequests(
  admin: SupabaseClient,
  opts: { status: SeatRequestStatus; cursor?: string | null; limit?: number }
): Promise<{ requests: SeatQueueEntry[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100)
  const ascending = opts.status === 'pending'
  let query = admin
    .from('teacher_seat_requests')
    .select(SEAT_REQUEST_COLUMNS)
    .eq('status', opts.status)
    .order('created_at', { ascending })
    .order('id', { ascending })
    .limit(limit + 1)

  const cursor = decodeSeatCursor(opts.cursor)
  if (cursor) {
    const op = ascending ? 'gt' : 'lt'
    query = query.or(
      `created_at.${op}."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.${op}.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = ((data ?? []) as SeatRequestRow[]).slice(0, limit)
  const emails = await Promise.all(rows.map((r) => accountEmail(admin, r.user_id)))
  const last = rows[rows.length - 1]
  return {
    requests: rows.map((r, i) => ({ ...r, account_email: emails[i] })),
    next_cursor:
      (data ?? []).length > limit && last ? encodeSeatCursor({ created_at: last.created_at, id: last.id }) : null,
  }
}

export function encodeSeatCursor(c: { created_at: string; id: string }): string {
  return Buffer.from(JSON.stringify([c.created_at, c.id]), 'utf8').toString('base64url')
}

export function decodeSeatCursor(raw: string | null | undefined): { created_at: string; id: string } | null {
  if (!raw || raw.length > 200) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!Array.isArray(parsed) || parsed.length !== 2) return null
    const [createdAt, id] = parsed
    if (typeof createdAt !== 'string' || !isUuid(id)) return null
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.test(createdAt)) return null
    if (!Number.isFinite(Date.parse(createdAt))) return null
    return { created_at: createdAt, id: id.toLowerCase() }
  } catch {
    return null
  }
}

export async function accountEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

/** Paged listUsers: the admin API has no lookup-by-email. For the CLI. */
export async function userIdForEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted)
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
}

/** Grants (or revokes) a seat directly — the outreach path, with no request. */
export async function setTeacherSeat(
  admin: SupabaseClient,
  opts: { userId: string; revoke: boolean; reason: string }
): Promise<void> {
  const { error } = await admin
    .from('user_profiles')
    .update(
      opts.revoke
        ? { teacher_verified_at: null, teacher_verified_reason: null }
        : { teacher_verified_at: new Date().toISOString(), teacher_verified_reason: opts.reason }
    )
    .eq('id', opts.userId)
  if (error) throw new Error(error.message)
}

/**
 * Closes a user's open request, if any — used when a seat is granted by hand,
 * so the queue does not keep showing a teacher who already has what they
 * asked for.
 */
export async function closeOpenRequest(
  admin: SupabaseClient,
  userId: string,
  status: 'approved' | 'declined',
  reason: string
): Promise<void> {
  const { error } = await admin
    .from('teacher_seat_requests')
    .update({ status, reviewed_reason: reason, reviewed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
}

export type ApplySeatDecisionResult =
  | { ok: true; status: 'approved' | 'declined'; userId: string; emailed: boolean }
  | { ok: false; status: 404 | 409 | 500; error: string }

/**
 * Approves or declines one request, then tells the teacher (in-app + email).
 *
 * Order matters. The request is closed first with a conditional update
 * (`status = 'pending'`), so of two reviewers acting at once exactly one wins;
 * the seat is written only by the winner. If writing the seat then fails, the
 * request is reopened so it is not left "approved" with no seat behind it.
 * The notifications are awaited — the CLI exits as soon as this returns.
 */
export async function applySeatDecision(
  admin: SupabaseClient,
  decision: SeatDecisionInput,
  opts: { teacherCap: number; freeCap: number }
): Promise<ApplySeatDecisionResult> {
  const { data: request, error: loadError } = await admin
    .from('teacher_seat_requests')
    .select(SEAT_REQUEST_COLUMNS)
    .eq('id', decision.requestId)
    .maybeSingle()
  if (loadError) return { ok: false, status: 500, error: 'Could not load the request.' }
  if (!request) return { ok: false, status: 404, error: 'Request not found.' }

  const row = request as SeatRequestRow
  const planned = planSeatDecision(row, decision, { teacherCap: opts.teacherCap })
  if (!planned.ok) return { ok: false, status: 409, error: planned.error }
  const { plan } = planned

  const reviewedAt = new Date().toISOString()
  const { data: closed, error: closeError } = await admin
    .from('teacher_seat_requests')
    .update({ status: plan.close.status, reviewed_reason: plan.close.reviewed_reason, reviewed_at: reviewedAt })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id')
  if (closeError) return { ok: false, status: 500, error: 'Could not update the request.' }
  if (!closed?.length) return { ok: false, status: 409, error: 'Someone else reviewed this request first.' }

  if (plan.grant) {
    try {
      await setTeacherSeat(admin, { userId: row.user_id, revoke: false, reason: plan.grant.teacher_verified_reason })
    } catch (err) {
      console.error('[teacher/seat] grant failed, reopening request:', err instanceof Error ? err.message : err)
      await admin
        .from('teacher_seat_requests')
        .update({ status: 'pending', reviewed_reason: null, reviewed_at: null })
        .eq('id', row.id)
      return { ok: false, status: 500, error: 'Could not grant the seat. The request is still open.' }
    }
  }

  // Tell the teacher. Best-effort from here on: the decision stands either way.
  const { error: notifyError } = await admin.from('notifications').insert({
    user_id: row.user_id,
    type: plan.notification.type,
    title: plan.notification.title,
    href: plan.notification.href,
  })
  if (notifyError) console.error('[teacher/seat] notification failed:', notifyError.message)

  let emailed = false
  const email = await accountEmail(admin, row.user_id).catch(() => null)
  if (email) {
    const { sendTeacherSeatApprovedEmail, sendTeacherSeatDeclinedEmail } = await import('@/lib/email/notifications')
    emailed = await (plan.email === 'approved'
      ? sendTeacherSeatApprovedEmail({ email, teacherCap: opts.teacherCap })
      : sendTeacherSeatDeclinedEmail({ email, reason: plan.close.reviewed_reason, freeCap: opts.freeCap })
    ).catch((err) => {
      console.error('[teacher/seat] email failed:', err instanceof Error ? err.message : err)
      return false
    })
  }

  return { ok: true, status: plan.close.status, userId: row.user_id, emailed }
}
