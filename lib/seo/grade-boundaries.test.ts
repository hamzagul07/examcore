import assert from 'node:assert/strict'
import { computeGrade, A_LEVEL_GRADES } from './grade-boundaries'

const thresholds = [
  { grade: 'A*', mark: 90 },
  { grade: 'A', mark: 80 },
  { grade: 'B', mark: 70 },
  { grade: 'C', mark: 60 },
  { grade: 'D', mark: 50 },
  { grade: 'E', mark: 40 },
]

// Lands on a B, 10 marks below an A.
let r = computeGrade(75, 100, thresholds)
assert.equal(r.grade, 'B', 'grade B')
assert.equal(r.nextGrade, 'A', 'next A')
assert.equal(r.marksToNext, 5, 'B->A gap')
assert.equal(r.percent, 75, 'percent')

// Exactly on the A* boundary → A*, top of ladder.
r = computeGrade(90, 100, thresholds)
assert.equal(r.grade, 'A*', 'A* boundary inclusive')
assert.equal(r.nextGrade, null, 'no grade above A*')
assert.equal(r.marksToNext, null, 'no marks to next at top')

// Below E → ungraded, reports gap to E.
r = computeGrade(30, 100, thresholds)
assert.equal(r.grade, 'U', 'ungraded')
assert.equal(r.nextGrade, 'E', 'next is E')
assert.equal(r.marksToNext, 10, 'gap to E')

// Blank thresholds → no grade but still a percentage.
r = computeGrade(50, 100, A_LEVEL_GRADES.map((g) => ({ grade: g, mark: '' as const })))
assert.equal(r.grade, null, 'no thresholds -> null grade')
assert.equal(r.percent, 50, 'percent still computed')

// Unsorted input is handled (highest boundary wins).
r = computeGrade(82, 100, [
  { grade: 'B', mark: 70 },
  { grade: 'A*', mark: 90 },
  { grade: 'A', mark: 80 },
])
assert.equal(r.grade, 'A', 'unsorted -> A')
assert.equal(r.marksToNext, 8, 'A->A* gap from unsorted')

console.log('grade-boundaries.test.ts: ok')
