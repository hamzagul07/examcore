import assert from 'node:assert/strict'
import {
  extractStatedTotalMarks,
  extractExplicitTotalMarks,
} from './question-marks'

// --- extractExplicitTotalMarks: explicit only, NEVER part-sum ---
assert.equal(extractExplicitTotalMarks('[Maximum mark: 16]'), 16, 'explicit max')
assert.equal(extractExplicitTotalMarks('(Total 7 marks)'), 7, 'explicit total')
assert.equal(
  extractExplicitTotalMarks('(a) [4] (b) [3] (c) [6] (d) [3]'),
  null,
  'part markers alone are NOT explicit (avoids the /13 bug)'
)

// --- Explicit "Maximum mark" wins, even over per-part markers ---
assert.equal(
  extractStatedTotalMarks('[Maximum mark: 8]\n(a) Find E[X]. [2]\n(b) Var(X). [3]\n(c) P(...). [3]'),
  8,
  'Maximum mark 8 wins over the [2][3][3] sub-parts (not 16)'
)
assert.equal(extractStatedTotalMarks('Maximum mark 16'), 16, 'no colon still parses')
assert.equal(extractStatedTotalMarks('[Maximum marks: 6]'), 6, 'plural "marks"')

// --- "(Total N marks)" forms ---
assert.equal(extractStatedTotalMarks('Do the thing. (Total 7 marks)'), 7, 'total N marks')
assert.equal(extractStatedTotalMarks('blah\nTotal: 12 marks'), 12, 'Total: N marks')

// --- Sum per-part markers when no explicit total is stated ---
assert.equal(
  extractStatedTotalMarks('(a) part one [2]\n(b) part two [3]\n(c) part three [1]'),
  6,
  'sum of [2]+[3]+[1]'
)
assert.equal(
  extractStatedTotalMarks('(a) do X (4 marks) (b) do Y (2 marks)'),
  6,
  'sum of worded (4 marks)+(2 marks)'
)
assert.equal(
  extractStatedTotalMarks('(a) part [2 marks] (b) part [4 marks]'),
  6,
  'sum of [2 marks]+[4 marks]'
)

// --- Nothing stated → null (caller falls back to model inference) ---
assert.equal(extractStatedTotalMarks('Find the derivative of x^2.'), null, 'no marks → null')
assert.equal(extractStatedTotalMarks(''), null, 'empty → null')
assert.equal(extractStatedTotalMarks(null), null, 'null → null')

// --- Guardrails: implausible values rejected ---
assert.equal(extractStatedTotalMarks('Maximum mark: 0'), null, 'zero rejected')
assert.equal(extractStatedTotalMarks('Maximum mark: 999'), null, 'over 100 rejected')

console.log('question-marks: all assertions passed')
