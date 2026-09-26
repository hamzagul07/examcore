import assert from 'node:assert/strict'
import { calculateLeafMastery, type AttemptLite } from '@/lib/mastery'
import { getSyllabusTree } from '@/lib/syllabi'
import {
  actionable,
  CRITICAL_BELOW_PCT,
  isBlindspot,
  levelFor,
  rankBlindspots,
  SECURE_FROM_PCT,
  toBlindspotInputs,
  type BlindspotInput,
} from '@/lib/teacher/blindspots'

function t(
  code: string,
  avgMastery: number,
  studentsAttempted: number,
  totalStudents = 28
): BlindspotInput {
  return { code, name: `Topic ${code}`, paper: 'P1', avgMastery, studentsAttempted, totalStudents }
}

// --- one threshold source, and it agrees with the student view ---------------------------

assert.equal(levelFor(39.9), 'critical')
assert.equal(levelFor(40), 'proficient')
assert.equal(levelFor(74.9), 'proficient')
assert.equal(levelFor(75), 'secure')
assert.equal(CRITICAL_BELOW_PCT, 40)
assert.equal(SECURE_FROM_PCT, 75)

// lib/mastery keeps its own copy of the bands private. Check behaviour at the
// edges, so the teacher and student views can never disagree about the same
// topic: critical ⇔ critical, proficient ⇔ proficient, secure ⇔ exam_ready.
const [group] = getSyllabusTree('9701')!
const leaf = group.leaves[0]
const STUDENT_LEVEL = { critical: 'critical', proficient: 'proficient', secure: 'exam_ready' } as const
for (const pct of [0, 20, 39.99, 40, 60, 74.99, 75, 90, 100]) {
  const attempts: AttemptLite[] = [0, 1, 2].map((i) => ({
    id: `a${i}`,
    marks_earned: pct / 10,
    total_marks: 10,
    syllabus_tags: [leaf.code],
    created_at: '2026-09-01T00:00:00Z',
  }))
  assert.equal(
    calculateLeafMastery(leaf, group.parent, attempts).level,
    STUDENT_LEVEL[levelFor(pct)],
    `bands agree at ${pct}%`
  )
}

// --- which topic averages are blindspots ---------------------------------------------------

assert.equal(isBlindspot({ avgMastery: 30, classAttempts: 3 }), true)
assert.equal(isBlindspot({ avgMastery: 74.9, classAttempts: 12 }), true, 'shaky is still a blindspot')
assert.equal(isBlindspot({ avgMastery: 75, classAttempts: 12 }), false, 'secure is not')
assert.equal(isBlindspot({ avgMastery: 10, classAttempts: 2 }), false, 'two attempts are a sample')
assert.equal(isBlindspot({ avgMastery: null, classAttempts: 0 }), false)
assert.equal(isBlindspot({ avgMastery: Number.NaN, classAttempts: 9 }), false)

// --- topic rows → chart rows ------------------------------------------------------------

const inputs = toBlindspotInputs(
  [
    { code: '1.1', name: 'Atoms', paper: 'AS', avgMastery: 30, studentsAttempted: 12 },
    { code: '1.2', name: 'Isotopes', paper: 'AS', avgMastery: null, studentsAttempted: 0 },
    { code: '1.3', name: 'Orbitals', paper: 'AS', avgMastery: 55, studentsAttempted: 40 },
  ],
  24
)
assert.deepEqual(inputs, [
  { code: '1.1', name: 'Atoms', paper: 'AS', avgMastery: 30, studentsAttempted: 12, totalStudents: 24 },
  { code: '1.3', name: 'Orbitals', paper: 'AS', avgMastery: 55, studentsAttempted: 24, totalStudents: 24 },
])
assert.equal(inputs[1].studentsAttempted, 24, 'never more attempters than students (never over 100%)')
assert.deepEqual(
  rankBlindspots(toBlindspotInputs([{ code: 'x', name: 'x', paper: 'P', avgMastery: 20, studentsAttempted: 3 }], 0)),
  [],
  'an empty class ranks nothing'
)

// --- ranking -----------------------------------------------------------------------------

const ranked = rankBlindspots([
  t('a', 62, 20),
  t('b', 31, 18),
  t('c', 48, 25),
  t('d', 31, 4), // same score as b, far less evidence
])

assert.deepEqual(
  ranked.map((r) => r.code),
  ['b', 'd', 'c', 'a'],
  'weakest first; ties break toward the better-evidenced topic'
)

const b = ranked.find((r) => r.code === 'b')!
assert.equal(b.level, 'critical')
assert.equal(b.coveragePct, 64)
assert.equal(b.thinEvidence, false)

// 4 of 28 is under a quarter of the class — weak evidence, flagged so a
// teacher doesn't reteach a topic on the strength of four scripts.
const d = ranked.find((r) => r.code === 'd')!
assert.equal(d.thinEvidence, true)
assert.equal(d.coveragePct, 14)

// A tiny class: the floor is 3 students, not 25% of 4.
const small = rankBlindspots([t('x', 30, 3, 4), t('y', 30, 2, 4)])
assert.equal(small.find((r) => r.code === 'x')!.thinEvidence, false)
assert.equal(small.find((r) => r.code === 'y')!.thinEvidence, true)

// An intervention should target what's weak AND trustworthy.
const act = actionable(ranked)
assert.deepEqual(act.map((r) => r.code), ['b', 'c', 'a'])
assert.ok(!act.some((r) => r.thinEvidence), 'never target thin evidence')

// Classrooms with no students can't produce a percentage.
assert.deepEqual(rankBlindspots([t('z', 50, 0, 0)]), [])

// The list is capped so one screen stays scannable.
const many = Array.from({ length: 30 }, (_, i) => t(`t${i}`, i * 2, 20))
assert.equal(rankBlindspots(many).length, 8)
assert.equal(rankBlindspots(many, 3).length, 3)

console.log('blindspots.test.ts: ok')
