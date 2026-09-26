import assert from 'node:assert/strict'
import { calculateLeafMastery, MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY, type AttemptLite } from '@/lib/mastery'
import { getSyllabusTree, getTotalSyllabusLeaves } from '@/lib/syllabi'
import {
  computeClassMastery,
  studentLeafLevel,
  usableMarks,
  type MasteryAttempt,
} from '@/lib/teacher/class-mastery'

// --- a student's level is exactly what their own heatmap says -------------------------

// lib/mastery keeps its thresholds private; compare behaviour instead, at every
// edge, so the teacher's "4 critical" is the four students whose own view says so.
const [group] = getSyllabusTree('9701')!
const leaf = group.leaves[0]
function lite(earned: number, total: number): AttemptLite {
  return { id: `x${earned}-${total}`, marks_earned: earned, total_marks: total, syllabus_tags: [leaf.code], created_at: '2026-09-01T00:00:00Z' }
}
for (const [pct, attempts] of [
  [0, 3],
  [39.99, 3],
  [40, 3],
  [74.99, 3],
  [75, 3],
  [100, 3],
  [20, 1],
  [90, 2],
  [50, 5],
] as const) {
  // Every attempt scores pct% of 10 marks, so the leaf is at exactly pct%.
  const list = Array.from({ length: attempts }, () => lite(pct / 10, 10))
  const own = calculateLeafMastery(leaf, group.parent, list)
  assert.equal(
    studentLeafLevel(pct, attempts),
    own.level,
    `class view agrees with lib/mastery at ${pct}% over ${attempts} attempt(s)`
  )
}
assert.equal(studentLeafLevel(100, MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY - 1), 'sampled', 'too few attempts to call it')

// --- usable marks ---------------------------------------------------------------------

assert.deepEqual(usableMarks({ marks_earned: 3, total_marks: 5 }), { earned: 3, total: 5 })
assert.equal(usableMarks({ marks_earned: 3, total_marks: 0 }), null, 'no total, no percentage')
assert.equal(usableMarks({ marks_earned: 3, total_marks: null }), null)
assert.equal(usableMarks({ marks_earned: null, total_marks: 5 }), null)
assert.equal(usableMarks({ marks_earned: Number.NaN, total_marks: 5 }), null)
assert.deepEqual(usableMarks({ marks_earned: 7, total_marks: 5 }), { earned: 5, total: 5 }, 'capped at the total')
assert.deepEqual(usableMarks({ marks_earned: -2, total_marks: 5 }), { earned: 0, total: 5 }, 'never negative')

// --- a Chemistry class --------------------------------------------------------------------

const a = (user: string, earned: number, total: number, tags: string[] | null): MasteryAttempt => ({
  user_id: user,
  marks_earned: earned,
  total_marks: total,
  syllabus_tags: tags,
})

const roster = ['amira', 'ben', 'cara', 'dev']
const work: MasteryAttempt[] = [
  // Amira: critical on 1.1 (3 attempts, 20%)
  a('amira', 1, 5, ['1.1']),
  a('amira', 1, 5, ['1.1']),
  a('amira', 1, 5, ['1.1']),
  // Ben: exam-ready on 1.1 (3 attempts, 100%), one attempt tagged with two leaves of section 1
  a('ben', 5, 5, ['1.1']),
  a('ben', 5, 5, ['1.1']),
  a('ben', 10, 10, ['1.1', '1.2']),
  // Cara: one attempt on 1.2 — sampled
  a('cara', 2, 10, ['1.2']),
  // Dev: section 2
  a('dev', 6, 10, ['2.1']),
  // Not usable / not in the class
  a('amira', 3, 0, ['1.1']),
  a('zed', 0, 10, ['1.1']),
  a('ben', 4, 4, ['99.99']),
]

const m = computeClassMastery(work, roster, '9701')
assert.equal(m.subjectCode, '9701')
assert.equal(m.totalStudents, 4)
assert.equal(m.totalLeaves, getTotalSyllabusLeaves('9701'), 'the coverage denominator is the registry leaf count')
assert.equal(m.leaves.length, m.totalLeaves)
assert.equal(m.leavesTouched, 3)
assert.equal(m.coveragePct, (3 / m.totalLeaves) * 100)

const l11 = m.leaves.find((l) => l.code === '1.1')!
assert.equal(l11.attempts, 6, "Zed's attempt and the zero-total one are not evidence")
assert.equal(l11.marksEarned, 3 + 20)
assert.equal(l11.marksAvailable, 15 + 20)
assert.equal(l11.classPct, (23 / 35) * 100)
assert.equal(l11.level, 'proficient')
assert.equal(l11.studentsAttempted, 2)
assert.deepEqual(l11.studentLevels, { sampled: 0, critical: 1, proficient: 0, exam_ready: 1 })
assert.deepEqual(l11.criticalStudentIds, ['amira'], 'the audience for a drill on 1.1')
assert.equal(l11.parentCode, '1')

const l12 = m.leaves.find((l) => l.code === '1.2')!
assert.equal(l12.attempts, 2)
assert.equal(l12.level, null, 'two attempts: no class level yet')
assert.deepEqual(l12.studentLevels, { sampled: 2, critical: 0, proficient: 0, exam_ready: 0 })

const section1 = m.parents.find((p) => p.code === '1')!
assert.equal(section1.attempts, 7, "Ben's 1.1+1.2 attempt is one attempt on section 1, not two")
assert.equal(section1.classPct, (3 + 20 + 2) / (15 + 20 + 10) * 100)
assert.equal(section1.studentsAttempted, 3)
assert.equal(section1.weakestLeafCode, '1.1', 'only evidenced leaves can be the weakest')
const section2 = m.parents.find((p) => p.code === '2')!
assert.equal(section2.weakestLeafCode, null, 'one attempt on 2.1 is not evidence of weakness')
const section3 = m.parents.find((p) => p.code === '3')!
assert.equal(section3.classPct, null)
assert.equal(section3.attempts, 0)

// Roster from the attempts when none is given.
assert.equal(computeClassMastery(work, null, '9701').totalStudents, 5)

// --- other subjects, and none -------------------------------------------------------------

const maths = computeClassMastery([a('amira', 2, 4, ['1.1'])], ['amira'], '9709')
assert.equal(maths.totalLeaves, 38)
assert.equal(maths.parents.length, 38, '9709 topics are each their own parent')
assert.equal(maths.leaves.find((l) => l.code === '1.1')!.name, 'Quadratics')

const ibHl = computeClassMastery([a('amira', 2, 4, ['R1.4'])], ['amira'], 'ib-chemistry-hl')
assert.equal(ibHl.leavesTouched, 1, 'IB leaves roll up the same way')

const none = computeClassMastery(work, roster, null)
assert.equal(none.totalLeaves, 0)
assert.equal(none.coveragePct, null, 'no subject: coverage unknown')
assert.deepEqual(none.parents, [])
assert.equal(computeClassMastery(work, roster, '4024').coveragePct, null, 'no syllabus tree: nothing borrowed')

const emptyClass = computeClassMastery([], [], '9701')
assert.equal(emptyClass.totalStudents, 0)
assert.equal(emptyClass.leavesTouched, 0)
assert.equal(emptyClass.coveragePct, 0)
assert.ok(emptyClass.leaves.every((l) => l.classPct === null && l.level === null))

console.log('class-mastery.test.ts: ok')
