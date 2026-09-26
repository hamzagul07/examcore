import assert from 'node:assert/strict'
import {
  capForAccess,
  capForTier,
  omniCapForAccess,
  TEACHER_CLASS_STUDENT_BONUS_DEFAULT,
  teacherClassStudentBonus,
  teacherMarkCap,
} from '@/lib/billing/caps'

/**
 * The class-bonus arithmetic (docs/TEACHER_SYSTEM_SPEC.md §7):
 *
 *   capForAccess(access, capTier, isTeacher, bonus) =
 *     (isTeacher ? max(base, teacherMarkCap) : base) + bonus
 *
 * Who is eligible is decided elsewhere (classBonusFor, covered by
 * teacher-seat.test.ts). This file pins the numbers the reservation is called
 * with, and that the bonus can only ever raise a cap.
 */

function withEnv(name: string, value: string | undefined, fn: () => void): void {
  const env = process.env as Record<string, string | undefined>
  const saved = env[name]
  if (value === undefined) delete env[name]
  else env[name] = value
  try {
    fn()
  } finally {
    if (saved === undefined) delete env[name]
    else env[name] = saved
  }
}

// --- TEACHER_CLASS_STUDENT_BONUS ------------------------------------------------

assert.equal(TEACHER_CLASS_STUDENT_BONUS_DEFAULT, 20, 'the spec default is 20 marks a month')

withEnv('TEACHER_CLASS_STUDENT_BONUS', undefined, () => {
  assert.equal(teacherClassStudentBonus(), 20, 'unset → the default')
})
withEnv('TEACHER_CLASS_STUDENT_BONUS', '', () => {
  assert.equal(teacherClassStudentBonus(), 20, 'empty → the default')
})
withEnv('TEACHER_CLASS_STUDENT_BONUS', '35', () => {
  assert.equal(teacherClassStudentBonus(), 35, 'raised mid-campaign without a deploy')
})
withEnv('TEACHER_CLASS_STUDENT_BONUS', ' 25\n', () => {
  assert.equal(teacherClassStudentBonus(), 25, 'dashboard-pasted whitespace is tolerated')
})
withEnv('TEACHER_CLASS_STUDENT_BONUS', '0', () => {
  assert.equal(teacherClassStudentBonus(), 0, '0 is the off switch, not a typo')
})
for (const junk of ['-5', 'twenty', '12.5', 'NaN', 'Infinity', '1e3x']) {
  withEnv('TEACHER_CLASS_STUDENT_BONUS', junk, () => {
    assert.equal(
      teacherClassStudentBonus(),
      20,
      `a malformed value (${JSON.stringify(junk)}) falls back to the default, never to 0 or a fraction`
    )
  })
}

// --- the bonus matrix -------------------------------------------------------------

const BONUS = 20
const teacherCap = teacherMarkCap()

// Students: each tier's own cap, plus the bonus. Additive, so paying never
// makes the class worth less.
assert.equal(capForAccess('free', 'free', false, BONUS), 5 + 20, 'free student in a verified class: 5 + 20')
assert.equal(capForAccess('pro', 'student', false, BONUS), capForTier('student') + 20, 'Starter + 20')
assert.equal(capForAccess('scholar', 'scholar', false, BONUS), capForTier('scholar') + 20, 'Scholar + 20')
assert.equal(capForAccess('max', 'mastery', false, BONUS), capForTier('mastery') + 20, 'Max + 20')

// A comp raises access but not the metered cap (see enforcement's cap_tier);
// the bonus rides on whatever that cap is.
assert.equal(capForAccess('max', 'scholar', false, BONUS), capForTier('scholar') + 20)

// Teachers are unaffected: the caller never passes them a bonus, and with
// none the seat's cap is exactly what it was.
assert.equal(capForAccess('scholar', 'free', true), teacherCap, 'teacher seat unchanged')
assert.equal(capForAccess('scholar', 'free', true, 0), teacherCap)
assert.equal(
  capForAccess('max', 'mastery', true, 0),
  Math.max(capForTier('mastery'), teacherCap),
  'a paying teacher keeps the larger of the two'
)

// No bonus: byte-identical to the three-argument form every caller used before.
for (const [access, tier] of [
  ['free', 'free'],
  ['pro', 'student'],
  ['scholar', 'scholar'],
  ['max', 'mastery'],
] as const) {
  assert.equal(capForAccess(access, tier, false, 0), capForAccess(access, tier), `${access}: bonus 0 changes nothing`)
  assert.equal(capForAccess(access, tier, true, 0), capForAccess(access, tier, true), `${access} teacher: bonus 0 changes nothing`)
}

// The bonus can only raise a cap.
assert.equal(capForAccess('free', 'free', false, -20), 5, 'a negative bonus is ignored, never subtracted')
assert.equal(capForAccess('free', 'free', false, Number.NaN), 5, 'NaN is no bonus')
assert.equal(capForAccess('free', 'free', false, Number.POSITIVE_INFINITY), 5, 'an infinite bonus is refused, not an unbounded bill')
assert.equal(capForAccess('free', 'free', false, 7.8), 5 + 7, 'whole marks only')
assert.ok(Number.isInteger(capForAccess('scholar', 'scholar', false, 3.3)), 'the RPC always receives an integer cap')

// Study chat has no class bonus.
assert.equal(omniCapForAccess('free', 'free'), omniCapForAccess('free', 'free', false))

console.log('caps.test.ts — all assertions passed')
