import type { SupabaseClient } from '@supabase/supabase-js'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { teacherClassStudentBonus } from './caps'

/**
 * The billing side of a verified teacher seat (docs/TEACHER_SYSTEM_SPEC.md §7).
 *
 * A seat (`user_profiles.teacher_verified_at`, service-role only) does two
 * things for billing:
 *
 *   1. The teacher marks on the teacher allowance — ./access floors them at
 *      Scholar, ./caps gives them teacherMarkCap(). Unchanged here.
 *   2. Every student in one of that teacher's live classes gets the CLASS
 *      BONUS: teacherClassStudentBonus() marks a month on top of their own
 *      cap. This file decides who gets it and supplies the copy that tells
 *      them so.
 *
 * Student marks — including marks on work a teacher set — are always charged
 * to the student. The bonus raises the cap `reserve_mark_usage` is called
 * with; it is not a pool anyone can drain, and it cannot follow a student out
 * of the class: `student_in_verified_classroom` only counts ACTIVE
 * memberships of NON-ARCHIVED classes, so leaving, being removed, the class
 * being archived or the seat being revoked all end it at the next mark.
 *
 * Client-safe on purpose (no server imports): the chip and the banner read
 * the copy helpers below. The RPC wrapper takes the client as an argument.
 */

/**
 * The class bonus a user gets, in marks a month. Zero for a teacher — their
 * own allowance is the seat, and a teacher who happens to be enrolled in a
 * colleague's class must not stack a student bonus on 300 marks — and zero
 * when the teacher system is switched off (TEACHER_V2=0), because the bonus is
 * part of it.
 *
 * `bonus` and `enabled` default to the environment; tests pass them.
 */
export function classBonusFor(opts: {
  inVerifiedClassroom: boolean
  isTeacher: boolean
  bonus?: number
  enabled?: boolean
}): number {
  const enabled = opts.enabled ?? isTeacherV2()
  if (!enabled || opts.isTeacher || !opts.inVerifiedClassroom) return 0
  const bonus = opts.bonus ?? teacherClassStudentBonus()
  return Number.isFinite(bonus) && bonus > 0 ? Math.floor(bonus) : 0
}

/**
 * Whether asking the database is worth a round trip at all: not when the
 * feature is off or the bonus is set to zero. (Whether the user is a teacher
 * is only known once the profile read that runs alongside it returns.)
 */
export function classBonusLookupNeeded(
  opts: { bonus?: number; enabled?: boolean } = {}
): boolean {
  const enabled = opts.enabled ?? isTeacherV2()
  const bonus = opts.bonus ?? teacherClassStudentBonus()
  return enabled && bonus > 0
}

let warnedMissingRpc = false

/**
 * `student_in_verified_classroom(p_user_id)` — service role only (it is
 * revoked from anon and authenticated, so a signed-in client cannot probe
 * which accounts are in verified classes). Pass the service client.
 *
 * Fails to false: the bonus is a gift, and a billing read that cannot be
 * answered must not hand one out. That is the conservative direction for
 * money and costs a student at most the bonus for the length of an outage;
 * the error is logged so the outage is not silent. A missing function (the
 * 20260926a migration not yet applied) is warned about once per instance
 * rather than on every mark.
 */
export async function studentInVerifiedClassroom(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await client.rpc('student_in_verified_classroom', {
      p_user_id: userId,
    })
    if (error) {
      const missing =
        error.code === 'PGRST202' ||
        /could not find the function|function .* does not exist/i.test(error.message ?? '')
      if (missing) {
        if (!warnedMissingRpc) {
          warnedMissingRpc = true
          console.warn(
            '[billing] student_in_verified_classroom not found — apply 20260926a_teacher_v2_classrooms.sql; no class bonus until then'
          )
        }
      } else {
        console.error('[billing] student_in_verified_classroom failed:', error.message)
      }
      return false
    }
    return data === true
  } catch (err) {
    console.error(
      '[billing] student_in_verified_classroom threw:',
      err instanceof Error ? err.message : String(err)
    )
    return false
  }
}

// ---------------------------------------------------------------------------
// Copy — shared by the credit chip, the limit banner and the teacher pages
// ---------------------------------------------------------------------------

/**
 * The class bonus carried on a billing summary (`questions.class_bonus`), as
 * a whole non-negative number. Anything else — an older API response without
 * the field, a string, a negative — reads as no bonus, so a client can never
 * show a bonus the server did not report.
 */
export function classBonusFromSummary(summary: unknown): number {
  if (!summary || typeof summary !== 'object') return 0
  const questions = (summary as { questions?: unknown }).questions
  if (!questions || typeof questions !== 'object') return 0
  const raw = (questions as { class_bonus?: unknown }).class_bonus
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
}

/** Chip text: "+20 from your class". */
export function classBonusLabel(bonus: number): string {
  return `+${Math.max(0, Math.floor(bonus))} from your class`
}

/**
 * The sentence the limit banner adds when the cap includes a class bonus.
 * Blocked: the student has used it, so the point is that the cap was already
 * raised (and resets with the rest). Approaching: the point is that part of
 * what is left came from the class.
 */
export function classBonusNote(bonus: number, state: 'blocked' | 'approaching'): string {
  const n = Math.max(0, Math.floor(bonus))
  const marks = `${n} mark${n === 1 ? '' : 's'}`
  return state === 'blocked'
    ? `That cap already includes ${marks} a month from your class. They come back with the rest of your allowance.`
    : `Your allowance includes ${marks} a month from your class, because your teacher's account is verified.`
}

/** For the assignment composer while the teacher's seat is not yet approved. */
export const UNVERIFIED_SEAT_STUDENT_NOTE =
  'Your students use their own allowance until your seat is approved.'

/** For a verified teacher's class pages: what the seat gives each student. */
export function verifiedSeatStudentNote(bonus: number = teacherClassStudentBonus()): string {
  const n = Math.max(0, Math.floor(bonus))
  return `Your students get +${n} mark${n === 1 ? '' : 's'} a month from this class, on top of their own allowance.`
}
