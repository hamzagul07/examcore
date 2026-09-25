/**
 * The join-a-class flow (docs/TEACHER_SYSTEM_SPEC.md §3 by-code / join, §4
 * `/join/[code]`, §8).
 *
 * The rule this module exists for: a student sees what joining shares — and
 * with whom — BEFORE they are enrolled. Joining gives the teacher read access
 * to the student's marked work in the class subject from that moment, so an
 * enrolment the student did not knowingly ask for is a privacy failure, not a
 * UX nit.
 *
 * The one place that could skip the statement is the post-sign-up return leg
 * (`/join/CODE?auto=1`), which joins without a second click so a student who
 * signed up in order to join does not silently fall off the roster. A bare
 * `?auto=1` is just a URL anyone can send, so it only auto-joins when this
 * browser recorded, moments earlier, that the student was shown the statement
 * on the signed-out card and chose "Sign up to join" (recordJoinConsent).
 * Otherwise the student gets the normal preview and presses Join themselves.
 *
 * Pure and client-safe; the storage helpers take the Storage object so they
 * can be tested without a browser.
 */

import type { MembershipStatus } from '@/lib/teacher/types'

/**
 * What leaving a class keeps and what it stops, said the same way on the
 * join page (before enrolling) and beside the Leave button.
 */
export const CLASS_RETENTION_NOTE =
  'If you leave, your teacher keeps the marks for sets you already handed in. Nothing you mark after that is shared with them.'

/** What `GET /api/classrooms/by-code/[code]` returns for a real, live class. */
export type InvitePreview = {
  name: string
  description: string | null
  /** "Mathematics · 9709" — what the teacher will see work in. */
  subject_label: string | null
  level: string | null
  /** First name and initial: who the student is agreeing to share work with. */
  teacher_display_name: string
  /** Active members only. */
  student_count: number
  /** The caller's own membership of this class, if any. */
  membership: MembershipStatus | 'none'
  /** The caller teaches this class (they cannot join it as a student). */
  own_class: boolean
}

/** What the student is shown once the preview has loaded. */
export type JoinView =
  /** Already an active member: nothing to do but go to the sets. */
  | 'member'
  /** Removed by the teacher: the code cannot add them back. */
  | 'removed'
  /** Their own class: share the code instead. */
  | 'own_class'
  /** Join straight away (post-sign-up leg with consent recorded). */
  | 'auto_join'
  /** The statement and a Join button. */
  | 'confirm'

export function joinViewFor(preview: InvitePreview, opts: { autoJoin: boolean; consentRecorded: boolean }): JoinView {
  if (preview.own_class) return 'own_class'
  if (preview.membership === 'active') return 'member'
  if (preview.membership === 'removed') return 'removed'
  return opts.autoJoin && opts.consentRecorded ? 'auto_join' : 'confirm'
}

// ---------------------------------------------------------------------------
// Consent recorded on the signed-out card
// ---------------------------------------------------------------------------

/** Long enough to sign up, confirm an email and come back; short enough not to linger. */
export const JOIN_CONSENT_TTL_MS = 60 * 60 * 1000

const CONSENT_PREFIX = 'ms-join-consent:'

export function joinConsentKey(code: string): string {
  return `${CONSENT_PREFIX}${code.trim().toUpperCase()}`
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The student read the statement and chose to sign up to join `code`. */
export function recordJoinConsent(storage: StorageLike | null | undefined, code: string, now: number = Date.now()): void {
  if (!storage) return
  try {
    storage.setItem(joinConsentKey(code), String(now))
  } catch {
    // Private mode / blocked storage: the student simply presses Join later.
  }
}

/** Whether a fresh consent for `code` was recorded in this browser. Consumes it. */
export function takeJoinConsent(storage: StorageLike | null | undefined, code: string, now: number = Date.now()): boolean {
  if (!storage) return false
  try {
    const key = joinConsentKey(code)
    const raw = storage.getItem(key)
    storage.removeItem(key)
    const at = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(at) && at <= now + 60_000 && now - at <= JOIN_CONSENT_TTL_MS
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// What a failed join says
// ---------------------------------------------------------------------------

/**
 * The student-facing message for a join the server refused. The API's own
 * `error` is a stable contract string (e.g. 'Removed by teacher'); this is the
 * sentence a student reads in a lesson.
 */
export function joinFailureMessage(status: number, body: { error?: unknown } | null | undefined): string {
  const apiError = typeof body?.error === 'string' ? body.error : ''
  switch (status) {
    case 401:
      return 'Your session ended. Sign in again to join.'
    case 404:
      return 'That invite code does not match a class. Check it with your teacher.'
    case 409:
      return 'Your teacher removed you from this class, so the code cannot add you back. Speak to your teacher.'
    case 410:
      return 'This class has been archived. Ask your teacher for a new code.'
    case 429:
      return apiError || 'Too many attempts today. Check the code with your teacher and try again tomorrow.'
    case 503:
      return 'Joining is unavailable for a moment. Try again in a minute.'
    default:
      return apiError && status >= 400 && status < 500 ? apiError : 'Could not join the class. Try again.'
  }
}

/** Where a student may be sent after joining; anything else falls back to the dashboard. */
const JOIN_DESTINATIONS = new Set(['/dashboard', '/dashboard/assignments'])

/**
 * The post-join destination the server named, if it is one of ours. The page
 * navigates to it, so it is never taken on trust (no `//host` or off-site
 * value can come through).
 */
export function joinDestination(raw: unknown): string {
  return typeof raw === 'string' && JOIN_DESTINATIONS.has(raw) ? raw : '/dashboard'
}
