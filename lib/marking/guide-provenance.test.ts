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
