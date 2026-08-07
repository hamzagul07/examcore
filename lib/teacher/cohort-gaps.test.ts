import assert from 'node:assert/strict'
import {
  buildCohortGapReport,
  headlineGap,
  markTypeCode,
  markTypeLabel,
  classificationLabel,
  type GapAttempt,
  type MarkPoint,
} from '@/lib/teacher/cohort-gaps'

function attempt(
  user: string,
  points: MarkPoint[],
  earned = points.filter((p) => p.earned).length
): GapAttempt {
  return {
    user_id: user,
    marks_earned: earned,
    total_marks: points.length,
    ai_marking: { marks_awarded: points },
  }
}

const pt = (type: string, earned: boolean, note?: string, cls?: string): MarkPoint => ({
  type,
  earned,
  margin_note: note ?? null,
  error_classification: cls ?? null,
})

// --- code parsing --------------------------------------------------------------

assert.equal(markTypeCode('An2'), 'AN', 'digits are stripped and the code uppercased')
assert.equal(markTypeCode('M1'), 'M')
assert.equal(markTypeCode('  ev10 '), 'EV', 'whitespace does not create a new type')
assert.equal(markTypeCode('3'), null, 'a bare number is not a mark type')
assert.equal(markTypeCode(''), null)
assert.equal(markTypeCode(null), null)
assert.equal(markTypeCode(undefined), null)

// Spelling variants fold into one code, so the same mark type cannot appear as
// two rows splitting the evidence between them.
assert.equal(markTypeCode('App1'), 'AP', 'App and Ap are the same mark type')
assert.equal(markTypeCode('Ap2'), 'AP')
assert.equal(markTypeCode('Eval1'), 'EV')

const aliased = buildCohortGapReport([
  attempt('s1', [pt('Ap1', false, 'missing'), pt('App2', false, 'missing')]),
  attempt('s2', [pt('Ap1', true), pt('App2', false, 'missing')]),
  attempt('s3', [pt('Ap1', true), pt('App2', true)]),
])
assert.equal(
  aliased.markTypes.filter((t) => t.label === 'Application').length,
  1,
  'one mark type is one row'
)
assert.equal(aliased.markTypes[0].points, 6, 'and it holds all the evidence')

assert.equal(markTypeLabel('AN'), 'Analysis')
assert.equal(markTypeLabel('M'), 'Method')
assert.equal(
  markTypeLabel('ZZ'),
  'ZZ',
  'an unrecognised code is shown as itself rather than hidden'
)

// --- the core rollup -------------------------------------------------------------

const report = buildCohortGapReport([
  attempt('s1', [
    pt('M1', true),
    pt('M2', true),
    pt('A1', true),
    pt('An1', false, 'Diagram is missing.', 'incomplete'),
    pt('An2', false, 'Analysis of the diagram is missing.', 'incomplete'),
    pt('Ev1', false, 'No evaluation offered.', 'incomplete'),
  ]),
  attempt('s2', [
    pt('M1', true),
    pt('M2', true),
    pt('A1', false, 'Arithmetic slip.', 'arithmetic'),
    pt('An1', false, 'Diagram is missing.', 'incomplete'),
    pt('An2', false, 'Analysis of the diagram is missing.', 'incomplete'),
    pt('Ev1', false, 'No evaluation offered.', 'incomplete'),
  ]),
  attempt('s3', [
    pt('M1', true),
    pt('M2', true),
    pt('A1', true),
    pt('An1', false, 'diagram is missing', 'incomplete'),
    pt('An2', true),
    pt('Ev1', false, 'No evaluation offered.', 'incomplete'),
  ]),
])

assert.equal(report.scripts, 3, 'every marked script counts')
assert.equal(report.students, 3, 'distinct students, not scripts')
assert.equal(report.marksEarned, 9)
assert.equal(report.marksAvailable, 18)
assert.equal(report.averagePct, 50, 'class average is marks earned over marks available')

const method = report.markTypes.find((t) => t.code === 'M')!
assert.equal(method.points, 6)
assert.equal(method.earned, 6)
assert.equal(method.earnedPct, 100, 'the class can do method')

const analysis = report.markTypes.find((t) => t.code === 'AN')!
assert.equal(analysis.points, 6)
assert.equal(analysis.earned, 1)
assert.equal(analysis.earnedPct, 17, 'and cannot analyse — the point of the report')

assert.equal(
  report.markTypes[0].code,
  'EV',
  'weakest mark type leads: 0% evaluation beats 17% analysis'
)

// --- recurring misses group across students, however the note was punctuated ----

const diagram = report.mostMissed.find((m) => /diagram is missing/i.test(m.note))!
assert.equal(diagram.students, 3, '"diagram is missing" and "Diagram is missing." are one miss')
assert.equal(diagram.occurrences, 3)
assert.equal(
  report.mostMissed[0].students,
  3,
  'ranked by how many students dropped it, not raw count'
)

// A note on an *earned* point is not a miss.
const earnedNote = buildCohortGapReport([
  attempt('s1', [pt('M1', true, 'Good method.'), pt('M2', true, 'Good method.')]),
])
assert.equal(earnedNote.mostMissed.length, 0, 'praise is not a gap')

// --- error classifications --------------------------------------------------------

const incomplete = report.errorBreakdown.find((e) => e.classification === 'incomplete')!
assert.equal(incomplete.count, 8)
assert.ok(
  !report.errorBreakdown.some((e) => e.classification === 'no_error'),
  '"no_error" describes an earned point and says nothing about why a mark was dropped'
)

// --- thin evidence is flagged, never silently averaged ----------------------------

const thin = buildCohortGapReport([
  attempt('s1', [pt('M1', true), pt('M2', true), pt('M3', true), pt('M4', true), pt('M5', true)]),
  attempt('s2', [pt('An1', false, 'missing')]),
  attempt('s3', [pt('An2', false, 'missing')]),
])
assert.equal(
  thin.markTypes.find((t) => t.code === 'AN')!.thinEvidence,
  true,
  '2 analysis points is not evidence of a weakness'
)
assert.equal(
  thin.markTypes.find((t) => t.code === 'M')!.thinEvidence,
  false,
  '5 points clears the bar'
)
assert.equal(
  headlineGap(thin),
  null,
  'the headline refuses to name a weakness that rests on 2 marks'
)

// --- too little marked work says so ------------------------------------------------

const empty = buildCohortGapReport([])
assert.equal(empty.scripts, 0)
assert.equal(empty.averagePct, 0, 'no division by zero on an empty class')
assert.equal(empty.insufficientEvidence, true)
assert.equal(headlineGap(empty), null)

const twoScripts = buildCohortGapReport([
  attempt('s1', [pt('An1', false, 'missing')]),
  attempt('s2', [pt('An2', false, 'missing')]),
])
assert.equal(twoScripts.insufficientEvidence, true, 'two scripts is not a cohort')

// Attempts with no marking breakdown are skipped rather than counted as zeroes.
const unmarked = buildCohortGapReport([
  { user_id: 's1', marks_earned: 5, total_marks: 10, ai_marking: null },
  { user_id: 's2', marks_earned: 5, total_marks: 10, ai_marking: { marks_awarded: [] } },
  attempt('s3', [pt('M1', true), pt('M2', false, 'slip')]),
])
assert.equal(unmarked.scripts, 1, 'an attempt with no per-point breakdown is not a script here')
assert.equal(unmarked.marksAvailable, 2, 'and does not inflate the class average')

// --- near-identical notes are one miss ----------------------------------------------

// Measured on the live corpus: exact string matching split a single miss across
// five rows, so a teacher saw five small problems instead of one large one.
const variants = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'No final answer for $a$ given')]),
  attempt('s2', [pt('A1', false, 'No final answer for a given')]),
  attempt('s3', [pt('A1', false, 'No final answer for a given')]),
])
assert.equal(variants.mostMissed.length, 1, 'maths delimiters are not a different miss')
assert.equal(variants.mostMissed[0].students, 3)

const filler = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'Final answer missing')]),
  attempt('s2', [pt('A1', false, 'Final answer is missing')]),
  attempt('s3', [pt('A1', false, 'The final answer is missing.')]),
])
assert.equal(filler.mostMissed.length, 1, '"is"/"the"/punctuation are not a different miss')
assert.equal(filler.mostMissed[0].students, 3)

// The label a teacher reads is the most common phrasing, not whichever came first.
const labelled = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'Working not shown')]),
  attempt('s2', [pt('A1', false, 'Working is not shown')]),
  attempt('s3', [pt('A1', false, 'Working is not shown')]),
  attempt('s4', [pt('A1', false, 'Working is not shown')]),
])
assert.equal(labelled.mostMissed[0].note, 'Working is not shown', 'the common wording wins')
assert.equal(labelled.mostMissed[0].students, 4)

// One student who phrased it two ways is still one student.
const sameStudent = buildCohortGapReport([
  attempt('s1', [
    pt('A1', false, 'Final answer missing'),
    pt('A2', false, 'Final answer is missing'),
  ]),
  attempt('s2', [pt('A1', false, 'Final answer missing')]),
  attempt('s3', [pt('A1', false, 'Final answer missing')]),
])
assert.equal(sameStudent.mostMissed[0].students, 3, 'students are a set, not a tally')
assert.equal(sameStudent.mostMissed[0].occurrences, 4, 'occurrences still count every point')

// --- but genuinely different misses must never merge --------------------------------

// These are ~75% identical by word overlap and are two different missing
// diagrams. Merging them would tell a teacher one thing was missed when two were.
const ordinals = buildCohortGapReport([
  attempt('s1', [
    pt('An1', false, 'Diagram for the first policy is missing'),
    pt('An2', false, 'Diagram for the second policy is missing'),
  ]),
  attempt('s2', [
    pt('An1', false, 'Diagram for the first policy is missing'),
    pt('An2', false, 'Diagram for the second policy is missing'),
  ]),
  attempt('s3', [pt('An1', false, 'Diagram for the first policy is missing')]),
])
assert.equal(ordinals.mostMissed.length, 2, 'first and second are different marks')

const numbered = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'Part 1 not attempted'), pt('A2', false, 'Part 2 not attempted')]),
  attempt('s2', [pt('A1', false, 'Part 1 not attempted'), pt('A2', false, 'Part 2 not attempted')]),
  attempt('s3', [pt('A1', false, 'Part 1 not attempted')]),
])
assert.equal(numbered.mostMissed.length, 2, 'numbers discriminate too')

// Negation flips meaning and is never a stopword.
const negation = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'Units given')]),
  attempt('s2', [pt('A1', false, 'Units not given')]),
  attempt('s3', [pt('A1', false, 'Units not given')]),
])
assert.equal(negation.mostMissed.length, 2, '"not given" is not "given"')

// --- classifications describe the student, not the marker ---------------------------

const classified = buildCohortGapReport([
  attempt('s1', [
    pt('A1', false, 'x', 'incomplete'),
    pt('A2', false, 'y', 'marker_error'),
    pt('A3', false, 'z', 'mark_not_earned'),
  ]),
  attempt('s2', [pt('A1', false, 'x', 'incomplete'), pt('A2', false, 'w', 'under_marked')]),
  attempt('s3', [pt('A1', false, 'x', 'arithmetic')]),
])

const codes = classified.errorBreakdown.map((e) => e.classification)
assert.ok(codes.includes('incomplete'), 'a real student error is reported')
assert.ok(codes.includes('arithmetic'))
// A panel headed "why marks were dropped", shown to a teacher deciding whether
// to trust this tool, must not be where the marker discusses its own mistakes.
for (const meta of ['marker_error', 'mark_not_earned', 'under_marked', 'no_error', 'none']) {
  assert.ok(!codes.includes(meta), `${meta} describes the marking, not the student`)
}

assert.equal(
  classified.errorBreakdown.find((e) => e.classification === 'incomplete')!.label,
  'Answer incomplete',
  'teachers read words, not snake_case'
)
assert.equal(classificationLabel('algebraic_sign'), 'Sign error')
assert.equal(
  classificationLabel('some_new_thing'),
  'Some new thing',
  'an unmapped code is de-snaked rather than hidden'
)

// Case and whitespace in the source data do not create a second bucket.
const messyCase = buildCohortGapReport([
  attempt('s1', [pt('A1', false, 'x', ' Incomplete ')]),
  attempt('s2', [pt('A1', false, 'x', 'incomplete')]),
])
assert.equal(messyCase.errorBreakdown.length, 1, 'one classification, one row')
assert.equal(messyCase.errorBreakdown[0].count, 2)

// --- banded scripts are excluded from the mark-type table ---------------------------

// A level-of-response essay is marked against band descriptors, not one entry
// per mark. Its "points" are a different unit from M/A/B marks, so mixing them
// into the same table makes every percentage in it wrong.
const mixed = buildCohortGapReport([
  attempt('s1', [pt('M1', true), pt('M2', true), pt('M3', false, 'slip')]),
  attempt('s2', [pt('M1', true), pt('M2', true), pt('M3', true)]),
  {
    user_id: 's3',
    marks_earned: 12,
    total_marks: 20,
    ai_marking: {
      marking_style: 'level_of_response',
      marks_awarded: [pt('AO1', false, 'Band 2 not reached')],
    },
  },
])

assert.equal(mixed.bandedScriptsExcluded, 1, 'the banded script is reported, not hidden')
assert.equal(mixed.scripts, 3, 'it is still a marked script')
assert.equal(
  mixed.marksAvailable,
  26,
  'and still counts toward the class average, which is measured in marks'
)
assert.equal(
  mixed.markTypes.find((t) => t.code === 'AO'),
  undefined,
  'but its band descriptor never enters the mark-type table'
)
assert.equal(
  mixed.markTypes.find((t) => t.code === 'M')!.points,
  6,
  'the point-based marks are unaffected'
)

// Its missed descriptor is still a real thing the student did not do, so it
// still belongs in the most-missed list.
assert.ok(
  mixed.mostMissed.some((m) => /band 2/i.test(m.note)),
  'a banded miss is still a miss'
)

assert.equal(
  buildCohortGapReport([]).bandedScriptsExcluded,
  0,
  'nothing excluded from an empty report'
)

// --- the headline only fires when it is both real and bad --------------------------

const strong = buildCohortGapReport([
  attempt('s1', [pt('M1', true), pt('M2', true), pt('M3', true), pt('M4', true), pt('M5', true)]),
  attempt('s2', [pt('M1', true), pt('M2', true), pt('M3', true), pt('M4', true), pt('M5', false, 'slip')]),
  attempt('s3', [pt('M1', true), pt('M2', true), pt('M3', true), pt('M4', true), pt('M5', true)]),
])
assert.equal(headlineGap(strong), null, 'a class at 93% has no headline weakness')

const weak = headlineGap(report)
assert.ok(weak, 'a real, well-evidenced weakness is named')
// Evaluation ranks worse (0% vs 17%) but rests on only 3 marked points, so the
// headline steps past it to the weakness that is actually evidenced. The raw
// ranking above still shows EV first — the table reports, the headline commits.
assert.equal(weak.code, 'AN', 'the headline names the worst *well-evidenced* gap')

console.log('cohort-gaps.test.ts — all assertions passed')
