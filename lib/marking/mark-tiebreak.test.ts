import assert from 'node:assert/strict'
import {
  TIEBREAK_MIN_DELTA,
  medianOfThree,
  needsTiebreak,
  pickMedianCandidate,
  styleNeedsTiebreak,
} from '@/lib/marking/mark-tiebreak'

// --- which styles ------------------------------------------------------------
//
// point_based agreed on 28 of 32 measured runs and never moved by more than one
// mark. Spending a third call there would buy latency and nothing else.
assert.equal(styleNeedsTiebreak('level_of_response'), true)
assert.equal(styleNeedsTiebreak('point_based'), false)
assert.equal(styleNeedsTiebreak('mcq'), false, 'MCQ is deterministic')
assert.equal(styleNeedsTiebreak(null), false)
assert.equal(styleNeedsTiebreak(undefined), false)

// --- when to spend the extra call --------------------------------------------

const essay = (firstMarks: number, verifyMarks: number) =>
  needsTiebreak({ style: 'level_of_response', firstMarks, verifyMarks })

assert.equal(essay(8, 8).needed, false, 'agreement needs no third opinion')
assert.equal(essay(8, 7).needed, false, 'one mark is ordinary examiner tolerance')
assert.equal(essay(8, 6).needed, true, `${TIEBREAK_MIN_DELTA} marks apart is a real disagreement`)
assert.equal(essay(2, 10).needed, true, 'the 8-mark swing seen in production')
assert.equal(essay(6, 8).needed, true, 'direction does not matter')
assert.equal(essay(8, 6).delta, 2, 'the gap is reported for the log line')

// Point-based never tiebreaks however far apart, because its pass is trustworthy
// and a disagreement there means something else is wrong.
assert.equal(
  needsTiebreak({ style: 'point_based', firstMarks: 2, verifyMarks: 10 }).needed,
  false
)

// Missing numbers must not be read as a disagreement of 0-or-anything.
for (const [a, b] of [
  [null, 8],
  [8, null],
  [undefined, undefined],
  [Number.NaN, 8],
] as const) {
  assert.equal(
    needsTiebreak({ style: 'level_of_response', firstMarks: a, verifyMarks: b })
      .needed,
    false,
    'an unknown mark cannot be compared'
  )
}

// --- the median --------------------------------------------------------------

assert.equal(medianOfThree(1, 8, 8), 8)
assert.equal(medianOfThree(8, 1, 8), 8)
assert.equal(medianOfThree(8, 8, 1), 8)
assert.equal(medianOfThree(1, 2, 3), 2)
assert.equal(medianOfThree(3, 2, 1), 2)
assert.equal(medianOfThree(5, 5, 5), 5)
assert.equal(medianOfThree(0, 0, 12), 0, 'two low draws hold the median down')

// The production incident: 8/12, then a collapsed 1/12, then 8/12 again. Under
// median-of-three the outlier cannot win — which is the whole point.
assert.equal(medianOfThree(8, 1, 8), 8, 'a single bad draw cannot decide the mark')

// --- picking the payload -----------------------------------------------------
//
// The student must read the reasoning that argued for the mark they got.
// Stitching a median number onto another sample's justification would recreate
// the "feedback describes a different answer" defect one layer down.

const picked = pickMedianCandidate([
  { marks: 1, payload: 'says it is a fragment' },
  { marks: 8, payload: 'marks it properly' },
  { marks: 8, payload: 'also marks it properly' },
])
assert.equal(picked.marks, 8)
assert.equal(
  picked.payload,
  'marks it properly',
  'the payload comes from a sample that actually argued for the median'
)

// Deterministic on ties: the earliest holder of the median value wins.
const tied = pickMedianCandidate([
  { marks: 7, payload: 'first seven' },
  { marks: 7, payload: 'second seven' },
  { marks: 2, payload: 'outlier' },
])
assert.equal(tied.payload, 'first seven')

// A strict median that matches no candidate cannot happen with three integers,
// but the fallback must still return something usable rather than undefined.
const allDifferent = pickMedianCandidate([
  { marks: 4, payload: 'a' },
  { marks: 9, payload: 'b' },
  { marks: 6, payload: 'c' },
])
assert.equal(allDifferent.marks, 6)
assert.equal(allDifferent.payload, 'c')

console.log('mark-tiebreak.test.ts: ok')
