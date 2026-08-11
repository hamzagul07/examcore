import assert from 'node:assert/strict'
import { effectiveAccess, isVerifiedTeacher } from '@/lib/billing/access'
import { capForAccess, omniCapForAccess, teacherMarkCap } from '@/lib/billing/caps'
import { quotaExceededBody } from '@/lib/billing/enforcement'

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
assert.equal(
  effectiveAccess({ tier: 'free', status: 'active', teacherVerified: true }),
  'pro',
  'a granted seat gets pro access without paying'
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
  'pro',
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
  warning: true,
  enforcement_mode: 'enforce' as const,
  marks_used: 300,
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

console.log('teacher-seat.test.ts — all assertions passed')
