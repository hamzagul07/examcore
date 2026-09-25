import assert from 'node:assert/strict'
import {
  aggregateWholePaperResults,
  buildPreviewCutResult,
  isTruncatedSegmentOutput,
  mergeSegmentations,
  parseWholePaperSegment,
} from './whole-paper'
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

// --- free-tier truncation: cut questions are neither zero nor "not attempted" --
//
// init slices the segmented list to the tier limit; the rest used to be filled
// in as 'unattempted' and scored 0, so a 3-of-8 preview headlined as a 30%
// paper with five "Not attempted" rows the student had in fact written.
{
  const paper = [1, 2, 3, 4, 5].map((n) => ({ question_number: String(n), total_marks: 10 }))
  const preview = aggregateWholePaperResults(
    '9709/21',
    'MJ25',
    [
      attempted('1', 8, 10),
      attempted('2', 9, 10),
      buildPreviewCutResult('3', 10),
      buildPreviewCutResult('4', 10),
    ],
    paper,
    { questionLimit: 2 }
  )
  assert.equal(preview.is_truncated, true)
  assert.equal(preview.questions_in_paper, 4, 'the student answered four questions')
  assert.equal(preview.question_limit, 2)
  assert.equal(preview.attempted_score?.marks_earned, 17)
  assert.equal(preview.attempted_score?.total_marks, 20)
  assert.equal(preview.attempted_score?.percentage, 85, 'what was marked still projects')
  assert.equal(
    preview.full_paper_score?.total_marks,
    30,
    'cut questions are excluded from the full-paper denominator (Q5 unattempted = 0 stays)'
  )
  assert.equal(preview.full_paper_score?.marks_earned, 17)
  assert.equal(
    preview.full_paper_score?.percentage,
    undefined,
    'no full-paper projection from a partial preview'
  )
  const cutRows = preview.questions.filter((q) => q.status === 'not_marked_preview')
  assert.equal(cutRows.length, 2, 'cut rows stay in the list with their own status')
  assert.ok(cutRows.every((q) => !q.answer_text), 'cut rows carry no text to retry against')
  assert.equal(
    preview.questions.find((q) => q.question_number === '5')?.status,
    'unattempted',
    'a genuinely blank question is still unattempted'
  )
  assert.ok(preview.summary.includes('2 more are marked on Scholar'), preview.summary)
  assert.ok(!preview.summary.includes('Not attempted'))
}

// no truncation → the fields are absent, so old consumers see nothing new
{
  const plain = aggregateWholePaperResults('9709/21', 'MJ25', [attempted('1', 3, 4)])
  assert.equal(plain.is_truncated, undefined)
  assert.equal(plain.questions_in_paper, undefined)
  assert.equal(plain.question_limit, undefined)
}

// --- segmentation: truncated model output is flagged, never silently shortened --
{
  const full = '{"paper_code":"9709/12","questions":[{"question_number":"1","answer_text":"a"},{"question_number":"2","answer_text":"b"}]}'
  const ok = parseWholePaperSegment(full, { finishReason: 'STOP' })
  assert.equal(ok?.truncated, false)
  assert.equal(ok?.questions.length, 2)

  const cut = '{"questions":[{"question_number":"1","answer_text":"a"},{"question_number":"2","answer_text":"b'
  const partial = parseWholePaperSegment(cut, { finishReason: 'MAX_TOKENS' })
  assert.ok(partial, 'what survived is still parsed')
  assert.equal(partial?.truncated, true, 'the finish reason marks it truncated')

  assert.equal(isTruncatedSegmentOutput(cut), true, 'an unterminated object is truncated even without a finish reason')
  assert.equal(isTruncatedSegmentOutput('```json\n' + full + '\n```'), false, 'a fenced, complete object is not')
  assert.equal(isTruncatedSegmentOutput(full, 'MAX_TOKENS'), true, 'MAX_TOKENS wins even when the text happens to close')

  assert.equal(parseWholePaperSegment('not json at all'), null)
}

// --- merging the model's list with the page-label split ----------------------
{
  const merged = mergeSegmentations(
    [{ question_number: '1', answer_text: 'model text 1' }, { question_number: '2', answer_text: 'model text 2' }],
    [
      { question_number: '2', answer_text: '[Page 2]\npage text 2' },
      { question_number: '3', answer_text: '[Page 3]\npage text 3' },
    ]
  )
  assert.deepEqual(
    merged.map((q) => q.question_number),
    ['1', '2', '3'],
    'the fallback supplies only what the model never reached'
  )
  assert.equal(merged[1].answer_text, 'model text 2', 'the model text is kept where both have it')
}

console.log('whole-paper (truncation + segmentation): all assertions passed')
