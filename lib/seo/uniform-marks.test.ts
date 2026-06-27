import assert from 'node:assert/strict'
import { rawToPum, type PumBoundary } from './uniform-marks'

// Boundaries out of 75: A=60, B=53, C=46, D=39, E=32
const b: PumBoundary[] = [
  { grade: 'A', mark: 60 },
  { grade: 'B', mark: 53 },
  { grade: 'C', mark: 46 },
  { grade: 'D', mark: 39 },
  { grade: 'E', mark: 32 },
]

// Exactly on the A boundary → PUM 80, grade A.
let r = rawToPum(60, 75, b)
assert.equal(r.pum, 80, 'A boundary = 80 PUM')
assert.equal(r.grade, 'A', 'grade A')

// Exactly on B → 70.
assert.equal(rawToPum(53, 75, b).pum, 70, 'B boundary = 70 PUM')

// Midway between B(53) and A(60): raw 56.5 → midway 70..80 = 75.
r = rawToPum(56.5, 75, b)
assert.equal(r.pum, 75, 'halfway B->A = 75 PUM')
assert.equal(r.grade, 'B', 'still a B below the A line')
assert.equal(r.nextGrade, 'A', 'next grade A')
assert.equal(r.marksToNext, 3.5, '3.5 marks to A')

// Full marks → 100.
assert.equal(rawToPum(75, 75, b).pum, 100, 'full marks = 100 PUM')

// Zero → 0.
assert.equal(rawToPum(0, 75, b).pum, 0, 'zero = 0 PUM')

// Below E → ungraded but still a PUM between 0 and 40.
r = rawToPum(16, 75, b)
assert.equal(r.grade, 'U', 'below E is ungraded')
assert.equal(r.pum, 20, 'raw 16 of E=32 → halfway 0..40 = 20 PUM')
assert.equal(r.nextGrade, 'E', 'next is E')

// No total → null.
assert.equal(rawToPum(50, 0, b).pum, null, 'no total -> null')

console.log('lib/seo/uniform-marks.test.ts — all assertions passed')
