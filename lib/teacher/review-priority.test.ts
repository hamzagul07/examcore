import assert from 'node:assert/strict'
import {
  BOUNDARY_MIN_TOTAL,
  REVIEW_REASON,
  scoreReviewPriority,
  UNUSUAL_GAP_POINTS,
  type AttemptForPriority,
} from '@/lib/teacher/review-priority'

const base: AttemptForPriority = { marks_earned: 6, total_marks: 8 }
const score = (over: Partial<AttemptForPriority>) => scoreReviewPriority({ ...base, ...over })

// --- a clean, unremarkable script sits at the bottom ------------------------------------

assert.deepEqual(scoreReviewPriority(base), { priority: 0, reasons: [] })

// --- each signal on its own -----------------------------------------------------------------

assert.deepEqual(score({ decision: 'flag' }), { priority: 40, reasons: [REVIEW_REASON.flagged] })
assert.deepEqual(score({ assignment: { is_mock: false } }), { priority: 15, reasons: [REVIEW_REASON.setWork] })
assert.deepEqual(
  score({ assignment: { is_mock: true } }),
  { priority: 40, reasons: [REVIEW_REASON.mock, REVIEW_REASON.setWork] },
  'a mock is set work too'
)
assert.deepEqual(score({ marks_earned: 0 }), { priority: 20, reasons: [REVIEW_REASON.zero] }, 'zero, not also "low score"')
assert.deepEqual(score({ ai_marking: { total_marks_source: 'estimated' } }).reasons, [REVIEW_REASON.estimatedTotal])
assert.deepEqual(score({ ai_marking: { total_marks_source: 'scheme' } }).reasons, [])
assert.deepEqual(
  score({ ai_marking: { marks_awarded: [{ earned: false, error_classification: 'overturned_first_marker_error' }] } }).reasons,
  [REVIEW_REASON.markerChanged],
  'the verify pass overturned a mark'
)
assert.deepEqual(score({ marks_earned: 3 }).reasons, [REVIEW_REASON.lowScore], '37.5% is below the critical line')
assert.deepEqual(score({ marks_earned: 4 }).reasons, [], '50% is not')
assert.deepEqual(score({ ai_marking: { marking_style: 'level_of_response' } }).reasons, [REVIEW_REASON.judgement])
assert.deepEqual(
  score({ ai_marking: { criteria_results: [{ criterion: 'A' }] } }).reasons,
  [REVIEW_REASON.judgement],
  'IB criterion marking (full ai_marking)'
)
assert.deepEqual(
  score({ ai_marking: { judgement_marking: true } }).reasons,
  [REVIEW_REASON.judgement],
  'the same fact from the loaders’ slice'
)
assert.deepEqual(score({ ai_marking: { band_result: null, criteria_results: [] } }).reasons, [], 'empty is absent')
assert.deepEqual(
  score({
    error_classifications: [{ classification: 'conceptual' }, { classification: 'conceptual' }, { classification: 'arithmetic' }],
  }).reasons,
  [REVIEW_REASON.conceptual]
)
assert.deepEqual(score({ error_classifications: [{ classification: 'conceptual' }] }).reasons, [], 'one is not repeated')
assert.deepEqual(
  score({
    ai_marking: {
      marks_awarded: [
        { earned: false, error_classification: 'conceptual' },
        { earned: false, error_classification: 'conceptual' },
      ],
    },
  }).reasons,
  [REVIEW_REASON.conceptual],
  'older rows: counted from the per-mark array'
)
for (const status of ['withdrawn', 'final-session', 'not-yet-in-force']) {
  assert.deepEqual(score({ ai_marking: { guide_notice: { status } } }).reasons, [REVIEW_REASON.oldGuide], status)
}
assert.deepEqual(score({ ai_marking: { guide_notice: { status: 'current' } } }).reasons, [])

// --- grade boundaries matter at paper length only -------------------------------------------

// 55/75 = 73.3% (A); A* is 80% = 60 marks — five away.
assert.deepEqual(score({ marks_earned: 55, total_marks: 75 }).reasons, [])
// 59/75 = 78.7%: one mark from A*.
assert.deepEqual(score({ marks_earned: 59, total_marks: 75 }).reasons, [REVIEW_REASON.nearBoundary])
assert.deepEqual(
  score({ marks_earned: 59, total_marks: 75, letter_grades: false }).reasons,
  [],
  'not on an IB or AP class, whose grades are not A*–E bands'
)
// On a 6-mark question every mark crosses a band; that is not a signal.
assert.deepEqual(score({ marks_earned: 4, total_marks: 6 }).reasons, [])
assert.ok(BOUNDARY_MIN_TOTAL > 6)

// --- unusual for this student ---------------------------------------------------------------

assert.deepEqual(
  score({ marks_earned: 2, total_marks: 8, student_mean_pct: 80, student_attempt_count: 12 }).reasons,
  [REVIEW_REASON.unusual, REVIEW_REASON.lowScore],
  '25% from an 80% student'
)
assert.deepEqual(
  score({ marks_earned: 8, total_marks: 8, student_mean_pct: 100 - UNUSUAL_GAP_POINTS + 0.1, student_attempt_count: 12 }).reasons,
  [],
  'inside the gap'
)
assert.deepEqual(
  score({ marks_earned: 2, total_marks: 8, student_mean_pct: 80, student_attempt_count: 2 }).reasons,
  [REVIEW_REASON.lowScore],
  'two attempts are no baseline'
)

// --- combined, ordered by weight, clamped ----------------------------------------------------

const everything = scoreReviewPriority({
  marks_earned: 0,
  total_marks: 40,
  decision: 'flag',
  assignment: { is_mock: true },
  ai_marking: {
    total_marks_source: 'estimated',
    marking_style: 'level_of_response',
    marks_awarded: [{ earned: false, error_classification: 'marker_error' }],
    guide_notice: { status: 'withdrawn' },
  },
  error_classifications: [{ classification: 'conceptual' }, { classification: 'conceptual' }],
  student_mean_pct: 70,
  student_attempt_count: 10,
})
assert.equal(everything.priority, 100, 'clamped')
assert.equal(everything.reasons[0], REVIEW_REASON.flagged, 'heaviest first')
assert.equal(everything.reasons[1], REVIEW_REASON.mock)
assert.ok(!everything.reasons.includes(REVIEW_REASON.lowScore), 'a zero is not also "low"')

// A reviewed script drops out of the queue but keeps its reasons.
const confirmed = score({ marks_earned: 0, decision: 'confirm' })
assert.deepEqual(confirmed, { priority: 0, reasons: [REVIEW_REASON.zero] })
assert.equal(score({ marks_earned: 0, decision: 'override' }).priority, 0)
assert.equal(score({ marks_earned: 0, decision: 'flag' }).priority, 60, 'a flag keeps it at the top')

// Garbage in is not a crash, and not a signal.
assert.deepEqual(scoreReviewPriority({ marks_earned: null, total_marks: null }), { priority: 0, reasons: [] })
assert.deepEqual(scoreReviewPriority({ marks_earned: Number.NaN, total_marks: 0 }), { priority: 0, reasons: [] })

console.log('review-priority.test.ts: ok')
