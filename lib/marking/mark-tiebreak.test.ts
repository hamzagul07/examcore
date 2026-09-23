import assert from 'node:assert/strict'
import {
  TIEBREAK_MIN_DELTA,
  maxCriterionDelta,
  medianOfThree,
  mergeMedianByCriterion,
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

// --- per objective ------------------------------------------------------------
//
// Measured on an examiner-marked 20-mark essay: seven runs of identical text
// scored 12–17 because the evaluation objective flipped between 1/7 and 7/7.
// Two passes can agree on the total while objectives swing in opposite
// directions, so the trigger and the median both work per objective.
const crit = (marks: Record<string, number>, note = '') =>
  Object.entries(marks).map(([criterion, m]) => ({
    criterion, criterion_name: criterion, level: m, marks_awarded: m, marks_available: 8,
    band_descriptor: `${criterion} band`, justification: `${note}${criterion} argued for ${m}`,
  }))

assert.equal(maxCriterionDelta(crit({ AO1: 3, AO4: 7 }), crit({ AO1: 3, AO4: 1 })), 6)
assert.equal(maxCriterionDelta(crit({ AO1: 3 }), crit({ ao1: 2 })), 1, 'criterion ids compare case-insensitively')
assert.equal(maxCriterionDelta(crit({ AO1: 3 }), crit({ AO2: 3 })), null, 'different criterion sets are unreadable')
assert.equal(maxCriterionDelta(undefined, crit({ AO1: 3 })), null)

const swap = needsTiebreak({
  style: 'level_of_response', firstMarks: 13, verifyMarks: 13,
  firstCriteria: crit({ AO1: 3, AO2: 2, AO3: 7, AO4: 1 }), verifyCriteria: crit({ AO1: 3, AO2: 2, AO3: 3, AO4: 5 }),
})
assert.equal(swap.needed, true, 'equal totals with a 4-mark objective swing still need a third opinion')
assert.equal(swap.delta, 4)
assert.equal(
  needsTiebreak({ style: 'level_of_response', firstMarks: 13, verifyMarks: 13, firstCriteria: crit({ AO1: 3, AO4: 6 }), verifyCriteria: crit({ AO1: 2, AO4: 7 }) }).needed,
  false, 'one-mark wobbles per objective are tolerance'
)

const passes: [
  { marks: number; payload: { criteria_results: ReturnType<typeof crit>; marks_earned: number; summary: string; band_result: { marks_awarded: number; level: number } } },
  { marks: number; payload: { criteria_results: ReturnType<typeof crit>; marks_earned: number; summary: string; band_result: { marks_awarded: number; level: number } } },
  { marks: number; payload: { criteria_results: ReturnType<typeof crit>; marks_earned: number; summary: string; band_result: { marks_awarded: number; level: number } } },
] = [
  { marks: 12, payload: { criteria_results: crit({ AO1: 2, AO2: 2, AO3: 6, AO4: 2 }, 'first '), marks_earned: 12, summary: 'first', band_result: { marks_awarded: 12, level: 2 } } },
  { marks: 17, payload: { criteria_results: crit({ AO1: 3, AO2: 2, AO3: 6, AO4: 6 }, 'verify '), marks_earned: 17, summary: 'verify', band_result: { marks_awarded: 17, level: 3 } } },
  { marks: 13, payload: { criteria_results: crit({ AO1: 2, AO2: 2, AO3: 7, AO4: 2 }, 'third '), marks_earned: 13, summary: 'third', band_result: { marks_awarded: 13, level: 2 } } },
]
const settled = mergeMedianByCriterion(passes)
assert.equal(settled.merged, true)
assert.deepEqual(settled.perCriterion, { AO1: [2, 3, 2], AO2: [2, 2, 2], AO3: [6, 6, 7], AO4: [2, 6, 2] })
const rows = Object.fromEntries(settled.payload.criteria_results.map((r) => [r.criterion, r]))
assert.equal(rows.AO1.marks_awarded, 2); assert.equal(rows.AO3.marks_awarded, 6); assert.equal(rows.AO4.marks_awarded, 2)
assert.equal(settled.payload.marks_earned, 12, 'the total is the sum of per-objective medians')
assert.match(rows.AO4.justification, /^first AO4 argued for 2/, "each objective keeps the justification that argued for its median mark")
assert.match(rows.AO3.justification, /^first AO3 argued for 6/, 'ties go to the earliest pass holding the median')
assert.equal(settled.payload.summary, 'first', 'the narrative comes from the pass whose total is nearest the merged sum')
assert.equal(settled.payload.band_result.marks_awarded, 12, 'the band roll-up follows the merged sum')

const unshared = mergeMedianByCriterion([
  { marks: 8, payload: { criteria_results: crit({ A: 8 }), marks_earned: 8, summary: 'a', band_result: { marks_awarded: 8, level: 2 } } },
  { marks: 6, payload: { criteria_results: crit({ B: 6 }), marks_earned: 6, summary: 'b', band_result: { marks_awarded: 6, level: 2 } } },
  { marks: 7, payload: { criteria_results: crit({ A: 7 }), marks_earned: 7, summary: 'c', band_result: { marks_awarded: 7, level: 2 } } },
])
assert.equal(unshared.merged, false, 'different criterion sets fall back to the whole-candidate median')
assert.equal(unshared.payload.summary, 'c')

console.log('mark-tiebreak.test.ts: ok')
