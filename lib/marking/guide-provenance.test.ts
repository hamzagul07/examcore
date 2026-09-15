import assert from 'node:assert/strict'
import { describeGuide } from '@/lib/marking/guide-provenance'

/**
 * What a student is told about the guide behind their mark.
 *
 * The failure this guards against is silence, not inaccuracy: marking a 2024
 * past paper against its own rubric is correct and useful, but a student who
 * has just started the course must be able to tell that the criteria they are
 * reading are ones they will never be assessed on.
 */
function main() {
  const g = (last: number | null, first = 2016) => ({
    subjectName: 'Visual Arts',
    guide: { version: '2016', firstAssessmentYear: first, lastAssessmentYear: last },
  })

  // --- not yet in force --------------------------------------------------------
  //
  // The catalogue holds 2027-cycle guides for Psychology, Visual Arts, Computer
  // Science, Design Technology and the Extended Essay, two of which are routed
  // to by default. A student marking in 2026 sits the PREVIOUS guide. This case
  // used to fall through to `unknown` and say nothing, because the checks below
  // only ever looked at the end date.
  const future = describeGuide(g(null, 2027), 2026)!
  assert.equal(future.status, 'not-yet-in-force')
  assert.ok(future.caution, 'a guide that is not theirs yet must say so')
  assert.match(future.caution!, /first assessed in 2027/)
  assert.match(future.caution!, /sit exams before 2027/)

  // It must win over `unknown`: a null end date is exactly what these rows have,
  // so checking the end date first is what hid them.
  assert.notEqual(describeGuide(g(null, 2027), 2026)!.status, 'unknown')

  // The session it starts is not "ahead" — that student is on it.
  assert.notEqual(describeGuide(g(null, 2027), 2027)!.status, 'not-yet-in-force')
  assert.equal(describeGuide(g(null, 2027), 2027)!.status, 'unknown')

  // A guide already in force with no end date keeps saying nothing, which is
  // the honest answer for a subject nobody has checked.
  assert.equal(describeGuide(g(null, 2016), 2026)!.status, 'unknown')
  assert.equal(describeGuide(g(null, 2016), 2026)!.caution, undefined)

  // A missing first-assessment year cannot place the guide either way.
  assert.equal(
    describeGuide(
      {
        subjectName: 'Visual Arts',
        guide: { version: null, firstAssessmentYear: null, lastAssessmentYear: null },
      },
      2026
    )!.status,
    'unknown'
  )

  // --- withdrawn ---------------------------------------------------------------
  const withdrawn = describeGuide(g(2023), 2026)!
  assert.equal(withdrawn.status, 'withdrawn')
  assert.ok(withdrawn.caution, 'a withdrawn guide must always carry a caution')
  assert.match(withdrawn.caution!, /last assessed in 2023/)
  assert.match(
    withdrawn.caution!,
    /no longer apply/,
    'the student needs to know the criteria themselves are out of date'
  )

  // --- final session -----------------------------------------------------------
  // Right for this year's candidates, wrong for anyone starting. Both are said,
  // because the same rubric genuinely serves one and misleads the other.
  const final = describeGuide(g(2026), 2026)!
  assert.equal(final.status, 'final-session')
  assert.ok(final.caution)
  assert.match(final.caution!, /final session/i)
  assert.match(final.caution!, /sitting exams this year/)

  // --- current -----------------------------------------------------------------
  const current = describeGuide(g(2030), 2026)!
  assert.equal(current.status, 'current')
  assert.equal(
    current.caution,
    undefined,
    'a current guide needs no announcement — noise here trains students to ignore the real warnings'
  )

  // --- unknown end date --------------------------------------------------------
  // Not the same as verified current: it is also what an unchecked subject looks
  // like. So it must neither claim currency nor cry wolf.
  const unknown = describeGuide(g(null), 2026)!
  assert.equal(unknown.status, 'unknown')
  assert.equal(unknown.caution, undefined)
  assert.match(unknown.label, /Visual Arts/)
  assert.doesNotMatch(unknown.label, /last assessed/)

  // --- no catalogued guide at all ----------------------------------------------
  // A generic band scale has no guide to name, and naming one would be exactly
  // the misattribution this module exists to prevent.
  assert.equal(describeGuide(null, 2026), null)
  assert.equal(
    describeGuide({ subjectName: 'Economics', guide: undefined }, 2026),
    null
  )

  // --- the label names the span ------------------------------------------------
  assert.equal(
    describeGuide(g(2026, 2016), 2026)!.label,
    'IB Visual Arts guide, first assessed 2016, last assessed 2026'
  )

  console.log('guide-provenance.test.ts: ok')
}

main()
