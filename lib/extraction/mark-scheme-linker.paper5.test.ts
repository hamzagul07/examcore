import assert from 'node:assert/strict'
import {
  linkMarkPointsToQuestions,
  parseMarkSchemeEntries,
  type QuestionRef,
} from './mark-scheme-linker'

const questions: QuestionRef[] = [
  { id: 'q1', question_number: '1', marks: 15, is_leaf: true },
  { id: 'q2a', question_number: '2(a)', marks: 1, is_leaf: true },
]

const entries = parseMarkSchemeEntries([
  {
    question_number: '1(Defining the problem)',
    question_subtotal: 3,
    marking_points: [{ point_text: 'P1', marks_awarded: 1 }],
  },
  {
    question_number: '1(Methods of data collection)',
    question_subtotal: 4,
    marking_points: [{ point_text: 'P2', marks_awarded: 1 }],
  },
  {
    question_number: '2(a)',
    question_subtotal: 1,
    marking_points: [{ point_text: 'gradient = n', marks_awarded: 1 }],
  },
])

const { linked, unmatchedMsHeaders } = linkMarkPointsToQuestions(
  entries,
  questions,
  'cambridge/9702/s24/ms_52.pdf'
)

assert.equal(unmatchedMsHeaders.length, 0)
assert.equal(linked.filter((p) => p.question_id === 'q1').length, 2)
assert.equal(linked.filter((p) => p.section_label).length, 2)
assert.equal(linked.find((p) => p.question_number === '2(a)')?.point_text, 'gradient = n')

console.log('mark-scheme-linker.paper5.test.ts: ok')
