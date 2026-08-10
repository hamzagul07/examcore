import assert from 'node:assert/strict'
import { resolveSplitQuestionTotalMarks } from './split-question-total'

assert.equal(
  resolveSplitQuestionTotalMarks({
    extracted: 9,
    splitterTotal: 12,
    studentTotal: 18,
    singleQuestionSplit: true,
  }),
  18,
  'single-Q: student total wins over extract/splitter'
)

assert.equal(
  resolveSplitQuestionTotalMarks({
    extracted: 9,
    splitterTotal: 12,
    studentTotal: null,
    singleQuestionSplit: true,
  }),
  9,
  'single-Q: extract next when no student total'
)

assert.equal(
  resolveSplitQuestionTotalMarks({
    extracted: 9,
    splitterTotal: 12,
    studentTotal: 18,
    singleQuestionSplit: false,
  }),
  9,
  'multi-Q: never stamp script-level student total onto each item'
)

assert.equal(
  resolveSplitQuestionTotalMarks({
    extracted: null,
    splitterTotal: null,
    studentTotal: 18,
    singleQuestionSplit: false,
  }),
  null,
  'multi-Q: missing per-question totals stay unlocked'
)

assert.equal(
  resolveSplitQuestionTotalMarks({
    extracted: null,
    splitterTotal: null,
    studentTotal: 6,
    singleQuestionSplit: true,
  }),
  6,
  'single-Q combined script can lock from student total alone'
)

console.log('split-question-total: all assertions passed')
