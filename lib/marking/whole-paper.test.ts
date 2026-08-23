import assert from 'node:assert/strict'
import { aggregateWholePaperResults } from './whole-paper'
import type { QuestionMarkResult } from './types'

function attempted(qn: string, earned: number, total: number): QuestionMarkResult {
  return {
    question_number: qn,
    marks_earned: earned,
    total_marks: total,
    marking_style: 'point_based',
    summary: 'ok',
    status: 'attempted',
    ai_marking: {
      marks_earned: earned,
      total_marks: total,
      summary: 'ok',
      weak_topics: [],
      what_to_study_next: '',
    },
    mark_scheme_id: null,
  }
}

function failed(qn: string, message: string): QuestionMarkResult {
  return {
    question_number: qn,
    marks_earned: 0,
    total_marks: 0,
    marking_style: 'point_based',
    summary: message,
    status: 'marking_failed',
    error_message: message,
    ai_marking: {
      marks_earned: 0,
      total_marks: 0,
      summary: message,
      weak_topics: [],
      what_to_study_next: '',
    },
    mark_scheme_id: null,
  }
}

const result = aggregateWholePaperResults('9709/21', 'MJ25', [
  attempted('1', 3, 4),
  failed(
    '2',
    'This question is not in our mark-scheme bank yet. Mark it as a single practice question and enter the total marks.'
  ),
  attempted('3', 2, 2),
])

assert.equal(result.questions_excluded_count, 1)
assert.equal(result.is_incomplete, true)
assert.equal(result.marks_earned, 5)
assert.equal(result.total_marks, 6)
assert.equal(result.percentage, undefined, 'an incomplete result must not publish a percentage')
assert.equal(result.estimated_grade, undefined, 'an incomplete result must not project a grade')
assert.equal(result.questions.length, 3)
assert.equal(result.questions[1]?.status, 'marking_failed')
assert.ok(
  result.questions[1]?.error_message?.includes('mark-scheme bank'),
  'failed Q guidance must stay on the displayed row'
)
assert.ok(
  result.summary.includes('could not be marked'),
  'summary should point at per-question details'
)
assert.ok(
  !result.summary.includes('excluded due to error'),
  'old exclusion wording must not return'
)
assert.ok(!result.summary.includes('%'), 'incomplete summary must not present a percentage')

// Nine perfect model calls and one failure used to headline 100% / A* by
// shrinking the denominator to 45. No projection is safer until Q10 is marked.
{
  const questions = Array.from({ length: 9 }, (_, index) =>
    attempted(String(index + 1), 5, 5)
  )
  const unmarked = failed('10', 'The marking model timed out.')
  unmarked.total_marks = 5
  unmarked.ai_marking.total_marks = 5
  const incomplete = aggregateWholePaperResults(
    '9709/21',
    'MJ25',
    [...questions, unmarked]
  )

  assert.equal(incomplete.marks_earned, 45)
  assert.equal(incomplete.total_marks, 45)
  assert.equal(incomplete.percentage, undefined)
  assert.equal(incomplete.estimated_grade, undefined)
  assert.equal(incomplete.full_paper_score?.percentage, undefined)
  assert.equal(incomplete.is_incomplete, true)
}

console.log('whole-paper: all assertions passed')
