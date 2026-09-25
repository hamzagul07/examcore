import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { effectiveAccess, isVerifiedTeacher } from '@/lib/billing/access'
import {
  capForAccess,
  capForTier,
  omniCapForAccess,
  teacherMarkCap,
} from '@/lib/billing/caps'
import { hasScholarFeatures } from '@/lib/billing/features'
import {
  deriveBillingContext,
  markCapFor,
  quotaExceededBody,
  type BillingContextInput,
} from '@/lib/billing/enforcement'
import {
  classBonusFor,
  classBonusFromSummary,
  classBonusLabel,
  classBonusLookupNeeded,
  classBonusNote,
  studentInVerifiedClassroom,
  UNVERIFIED_SEAT_STUDENT_NOTE,
  verifiedSeatStudentNote,
} from '@/lib/billing/teacher-seat'

// --- a granted seat is not the same thing as a self-declared role -------------

assert.equal(isVerifiedTeacher(null), false, 'no grant, no seat')
assert.equal(isVerifiedTeacher(undefined), false, 'no grant, no seat')
assert.equal(isVerifiedTeacher(''), false, 'an empty timestamp is not a grant')
assert.equal(isVerifiedTeacher('2026-08-07T00:00:00Z'), true, 'a grant is a seat')

// The whole point of the split: `role` is client-writable, so it must not be
// able to reach this decision at all. effectiveAccess takes `teacherVerified`
// and nothing else, and an unverified account stays on free.
assert.equal(
  effectiveAccess({ tier: 'free', status: 'active' }),
  'free',
  'a free account with no grant is free'
)
assert.equal(
  effectiveAccess({ tier: 'free', status: 'active', teacherVerified: false }),
  'free',
  'declaring yourself a teacher grants nothing'
)
// Scholar, not pro. `pro` now carries the Starter tier, and gating Scholar
// features against it would have taken whole-paper marking — the thing a
// teacher marking a class set needs most — away from the seat that exists to
// put this in front of a class. See lib/billing/access.ts.
assert.equal(
  effectiveAccess({ tier: 'free', status: 'active', teacherVerified: true }),
  'scholar',
  'a granted seat gets scholar access without paying'
)
assert.equal(
  hasScholarFeatures(
    effectiveAccess({ tier: 'free', status: 'active', teacherVerified: true })
  ),
  true,
  'a teacher can mark a whole class set, which is the point of the seat'
)

// --- a seat floors access, it never lowers it ---------------------------------

assert.equal(
  effectiveAccess({ tier: 'mastery', status: 'active', teacherVerified: true }),
  'max',
  'a teacher who pays for Max keeps Max'
)
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'active', teacherVerified: true }),
  'scholar',
  'a paying teacher keeps their paid access level'
)

// A cancelled subscription still leaves the seat intact — the teacher is the
// distribution channel whether or not they ever paid.
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'canceled', teacherVerified: true }),
  'scholar',
  'a lapsed subscription falls back to the seat, not to free'
)
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'canceled' }),
  'free',
  'without a seat, a lapsed subscription is free — unchanged behaviour'
)

// --- caps ----------------------------------------------------------------------

const teacherCap = teacherMarkCap()
assert.ok(teacherCap > 0, 'there is always a cap — an unbounded seat is an unbounded bill')

assert.equal(
  capForAccess('pro', 'free', true),
  teacherCap,
  'a teacher seat marks on the teacher allowance, not the free one'
)
assert.ok(
  capForAccess('pro', 'free', true) > capForAccess('free', 'free', false),
  'a class set does not fit in the free allowance'
)

// Never reduce what someone already pays for.
assert.equal(
  capForAccess('max', 'mastery', true),
  Math.max(capForAccess('max', 'mastery', false), teacherCap),
  'the seat floors the cap rather than replacing it'
)
assert.ok(
  omniCapForAccess('pro', 'free', true) > omniCapForAccess('free', 'free', false),
  'the study-chat allowance is raised for a seat too'
)

// Default (non-teacher) behaviour must be byte-identical to before the change.
assert.equal(capForAccess('free', 'free'), capForAccess('free', 'free', false))
assert.equal(capForAccess('pro', 'scholar'), capForAccess('pro', 'scholar', false))
assert.equal(omniCapForAccess('max', 'mastery'), omniCapForAccess('max', 'mastery', false))

// --- a teacher at their cap is not sold a smaller plan --------------------------

const base = {
  allowed: false,
  blocked_by_mode: true,
  remaining: 0,
  used: 300,
  cap: 300,
  credit_balance: 0,
  tier: 'free' as const,
  status: 'active' as const,
  // The seat's access, resolved like the gate does — it now rides on the
  // allowance so feature gates stop recomputing it from tier/status alone.
  access: 'scholar' as const,
  warning: true,
  enforcement_mode: 'enforce' as const,
  marks_used: 300,
  class_bonus: 0,
}

assert.equal(
  quotaExceededBody({ ...base, teacher_seat: true, reason: 'teacher_seat_cap' }).upgrade_url,
  '/contact',
  'a teacher is not pointed at a paid plan smaller than the seat they already hold'
)
assert.equal(
  quotaExceededBody({ ...base, teacher_seat: false, reason: 'free_tier_cap' }).upgrade_url,
  '/pricing',
  'everyone else still sees pricing — unchanged'
)

assert.equal(
  quotaExceededBody({ ...base, teacher_seat: false, reason: 'free_tier_cap', cap: 25, class_bonus: 20 })
    .class_bonus,
  20,
  'a blocked student is told how much of the cap their class already added'
)

// --- the class bonus: who gets it ---------------------------------------------
// A verified teacher's seat reaches their students as +N marks a month on the
// student's own cap. Pinned here with explicit numbers so the matrix does not
// depend on the environment the test runs in.

const on = { bonus: 20, enabled: true }
assert.equal(classBonusFor({ inVerifiedClassroom: true, isTeacher: false, ...on }), 20, 'student in a verified class')
assert.equal(classBonusFor({ inVerifiedClassroom: false, isTeacher: false, ...on }), 0, 'no verified class, no bonus')
assert.equal(
  classBonusFor({ inVerifiedClassroom: true, isTeacher: true, ...on }),
  0,
  'a teacher enrolled in a colleague\'s class does not stack a student bonus on the seat'
)
assert.equal(
  classBonusFor({ inVerifiedClassroom: true, isTeacher: false, bonus: 20, enabled: false }),
  0,
  'TEACHER_V2=0 switches the bonus off with the rest of the teacher system'
)
assert.equal(classBonusFor({ inVerifiedClassroom: true, isTeacher: false, bonus: 0, enabled: true }), 0, 'bonus set to 0')
assert.equal(classBonusFor({ inVerifiedClassroom: true, isTeacher: false, bonus: -5, enabled: true }), 0, 'never negative')
assert.equal(classBonusFor({ inVerifiedClassroom: true, isTeacher: false, bonus: 7.9, enabled: true }), 7, 'whole marks only')

assert.equal(classBonusLookupNeeded({ bonus: 20, enabled: true }), true)
assert.equal(classBonusLookupNeeded({ bonus: 0, enabled: true }), false, 'no round trip for a bonus of 0')
assert.equal(classBonusLookupNeeded({ bonus: 20, enabled: false }), false, 'no round trip with the feature off')

// --- the class bonus reaches the gate's cap -------------------------------------
// deriveBillingContext is what reserve_mark_usage's p_cap comes from
// (markCapFor), so these are the numbers the atomic reservation enforces.

const USER = '00000000-0000-4000-8000-00000000c1a5'
const ctx = (over: Partial<BillingContextInput>) =>
  deriveBillingContext({
    userId: USER,
    sub: null,
    creditBalance: 0,
    teacherVerifiedAt: null,
    inVerifiedClassroom: false,
    enforcementMode: 'enforce',
    classBonus: on,
    now: new Date('2026-09-25T12:00:00Z'),
    ...over,
  })

{
  const student = ctx({ inVerifiedClassroom: true })
  assert.equal(student.class_bonus, 20)
  assert.equal(markCapFor(student), capForTier('free') + 20, 'an eligible free student marks 5 + 20')
  assert.equal(student.subscription_inactive, false)

  const outsider = ctx({})
  assert.equal(outsider.class_bonus, 0)
  assert.equal(markCapFor(outsider), capForTier('free'), 'no class, the free cap exactly as before')

  const scholar = ctx({
    inVerifiedClassroom: true,
    sub: {
      tier: 'scholar',
      status: 'active',
      current_period_start: '2026-09-10T00:00:00Z',
      current_period_end: '2026-10-10T00:00:00Z',
    },
  })
  assert.equal(markCapFor(scholar), capForTier('scholar') + 20, 'a paying student keeps their cap and gains the bonus')
  assert.equal(scholar.window.source, 'subscription', 'the bonus does not move a subscriber off their billing window')

  const teacher = ctx({ inVerifiedClassroom: true, teacherVerifiedAt: '2026-08-07T00:00:00Z' })
  assert.equal(teacher.class_bonus, 0, 'a teacher never gets the student bonus')
  assert.equal(markCapFor(teacher), teacherCap, 'the teacher allowance is unaffected')

  // A lapsed subscriber used to get no allowance slot at all. In a verified
  // teacher's class they fall back to what every free classmate has.
  const lapsedInClass = ctx({ inVerifiedClassroom: true, sub: { tier: 'scholar', status: 'canceled' } })
  assert.equal(lapsedInClass.subscription_inactive, false)
  assert.equal(markCapFor(lapsedInClass), capForTier('free') + 20)
  assert.equal(lapsedInClass.window.source, 'free_tier', 'metered over the calendar month, like a free student')

  const lapsedAlone = ctx({ sub: { tier: 'scholar', status: 'canceled' } })
  assert.equal(lapsedAlone.subscription_inactive, true, 'without a class, a lapsed subscription is inactive — unchanged')

  const switchedOff = ctx({ inVerifiedClassroom: true, classBonus: { bonus: 20, enabled: false } })
  assert.equal(markCapFor(switchedOff), capForTier('free'), 'kill switch restores the old cap')
}

// --- the RPC wrapper fails to "no bonus" ----------------------------------------

function fakeClient(result: () => unknown): { client: SupabaseClient; calls: unknown[][] } {
  const calls: unknown[][] = []
  const client = {
    rpc: async (...args: unknown[]) => {
      calls.push(args)
      return result()
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

async function rpcCases(): Promise<void> {
  const yes = fakeClient(() => ({ data: true, error: null }))
  assert.equal(await studentInVerifiedClassroom(yes.client, USER), true)
  assert.deepEqual(yes.calls[0], ['student_in_verified_classroom', { p_user_id: USER }])

  const no = fakeClient(() => ({ data: false, error: null }))
  assert.equal(await studentInVerifiedClassroom(no.client, USER), false)

  // Only a real boolean true counts; a truthy string from a misbehaving proxy does not.
  const odd = fakeClient(() => ({ data: 'true', error: null }))
  assert.equal(await studentInVerifiedClassroom(odd.client, USER), false)

  const quiet = console.error
  const quietWarn = console.warn
  const logged: string[] = []
  console.error = (...a: unknown[]) => void logged.push(String(a[0]))
  console.warn = (...a: unknown[]) => void logged.push(String(a[0]))
  try {
    const denied = fakeClient(() => ({ data: null, error: { code: '42501', message: 'permission denied' } }))
    assert.equal(await studentInVerifiedClassroom(denied.client, USER), false, 'a user-scoped client is refused, and that means no bonus')

    const missing = fakeClient(() => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }))
    assert.equal(await studentInVerifiedClassroom(missing.client, USER), false)
    assert.equal(await studentInVerifiedClassroom(missing.client, USER), false)
    assert.equal(
      logged.filter((l) => l.includes('not found')).length,
      1,
      'an unapplied migration is warned about once, not on every mark'
    )

    const boom = fakeClient(() => {
      throw new Error('socket hang up')
    })
    assert.equal(await studentInVerifiedClassroom(boom.client, USER), false, 'a thrown client error is no bonus, not a failed mark')
  } finally {
    console.error = quiet
    console.warn = quietWarn
  }
}

// --- copy -----------------------------------------------------------------------

assert.equal(classBonusFromSummary({ questions: { class_bonus: 20 } }), 20)
assert.equal(classBonusFromSummary({ questions: {} }), 0, 'an older API without the field shows no bonus')
assert.equal(classBonusFromSummary({ questions: { class_bonus: '20' } }), 0, 'only a number counts')
assert.equal(classBonusFromSummary({ questions: { class_bonus: -3 } }), 0)
assert.equal(classBonusFromSummary(null), 0)
assert.equal(classBonusFromSummary({ signedIn: false }), 0)
assert.equal(classBonusLabel(20), '+20 from your class')
assert.match(classBonusNote(20, 'blocked'), /already includes 20 marks a month from your class/)
assert.match(classBonusNote(1, 'approaching'), /includes 1 mark a month from your class/)
assert.match(verifiedSeatStudentNote(20), /\+20 marks a month from this class/)
assert.match(UNVERIFIED_SEAT_STUDENT_NOTE, /own allowance until your seat is approved/)

rpcCases()
  .then(() => console.log('teacher-seat.test.ts — all assertions passed'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
