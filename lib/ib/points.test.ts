import assert from 'node:assert/strict'
import { bonusPoints, computeDiploma, type DiplomaSubject } from './points'

// --- TOK/EE matrix ---
assert.equal(bonusPoints('A', 'A').points, 3, 'A/A = 3')
assert.equal(bonusPoints('A', 'C').points, 2, 'A/C = 2')
assert.equal(bonusPoints('C', 'D').points, 0, 'C/D = 0')
assert.equal(bonusPoints('D', 'B').points, 1, 'D/B = 1')
assert.equal(bonusPoints('E', 'A').failingCondition, true, 'E in TOK = failing condition')
assert.equal(bonusPoints('A', 'E').points, 0, 'E in EE = 0 bonus')

const hl = (grade: number): DiplomaSubject => ({ grade: grade as DiplomaSubject['grade'], level: 'HL' })
const sl = (grade: number): DiplomaSubject => ({ grade: grade as DiplomaSubject['grade'], level: 'SL' })

// --- Perfect 45 ---
let r = computeDiploma([hl(7), hl(7), hl(7), sl(7), sl(7), sl(7)], 'A', 'A')
assert.equal(r.subjectTotal, 42, '6×7 = 42')
assert.equal(r.bonus, 3, 'A/A bonus 3')
assert.equal(r.total, 45, 'max 45')
assert.equal(r.awarded, true, '45 is awarded')

// --- Solid pass (32) ---
r = computeDiploma([hl(6), hl(5), hl(5), sl(6), sl(5), sl(4)], 'B', 'B')
assert.equal(r.subjectTotal, 31, 'subject total')
assert.equal(r.bonus, 2, 'B/B bonus 2')
assert.equal(r.total, 33, 'total 33')
assert.equal(r.awarded, true, 'awarded')

// --- Below 24 → not awarded ---
r = computeDiploma([hl(4), hl(4), hl(4), sl(3), sl(3), sl(3)], 'C', 'C')
assert.equal(r.total, 22, 'total 22 (21 + 1 bonus)')
assert.equal(r.awarded, false, 'below 24 not awarded')
assert.equal(r.conditions.find((c) => c.label.includes('24 points'))!.pass, false, '24-point condition fails')

// --- E in TOK fails even with high points ---
r = computeDiploma([hl(7), hl(7), hl(6), sl(6), sl(6), sl(6)], 'E', 'A')
assert.equal(r.bonus, 0, 'E bonus 0')
assert.equal(r.awarded, false, 'E in TOK is a failing condition')

// --- HL points below 12 fails ---
r = computeDiploma([hl(4), hl(4), hl(3), sl(7), sl(7), sl(7)], 'A', 'A')
assert.equal(r.hlPoints, 11, 'HL 11')
assert.equal(r.awarded, false, 'HL < 12 not awarded')

// --- Grade 1 fails ---
r = computeDiploma([hl(7), hl(7), hl(1), sl(7), sl(7), sl(7)], 'A', 'A')
assert.equal(r.awarded, false, 'a grade 1 is a failing condition')

console.log('lib/ib/points.test.ts — all assertions passed')
