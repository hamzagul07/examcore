import assert from 'node:assert/strict'
import { buildPostMarkDiagnosis } from '@/lib/marking/post-mark-ask'

function lost(classification?: string | null) {
  return { earned: false, error_classification: classification ?? null }
}
function won() {
  return { earned: true, error_classification: 'no_error' }
}

function main() {
  // Full marks, no marks, or a malformed total → nothing to diagnose. The
  // caller renders no upsell at all rather than an empty one.
  assert.equal(
    buildPostMarkDiagnosis({ marksAwarded: [won(), won()], marksEarned: 2, totalMarks: 2 }),
    null,
    'full marks has no diagnosis'
  )
  assert.equal(
    buildPostMarkDiagnosis({ marksAwarded: [], marksEarned: 0, totalMarks: 0 }),
    null
  )
  assert.equal(
    buildPostMarkDiagnosis({ marksAwarded: [], marksEarned: 0, totalMarks: NaN }),
    null,
    'a malformed total must not produce "you lost NaN marks"'
  )

  // A clear pattern: 3 of 4 lost marks share a classification.
  const clear = buildPostMarkDiagnosis({
    marksAwarded: [won(), lost('incomplete'), lost('incomplete'), lost('incomplete'), lost('arithmetic')],
    marksEarned: 1,
    totalMarks: 5,
  })!
  assert.equal(clear.lostMarks, 4)
  assert.equal(clear.pattern?.classification, 'incomplete')
  assert.equal(clear.pattern?.count, 3)
  assert.equal(clear.headline, 'You lost 4 marks — 3 of them to incomplete working.')
  assert.ok(clear.detail.length > 0, 'a named pattern must carry its corrective line')

  // Every lost mark shares the classification → "all of them", which reads
  // better than "4 of them" when 4 is also the total.
  const all = buildPostMarkDiagnosis({
    marksAwarded: [lost('conceptual'), lost('conceptual')],
    marksEarned: 0,
    totalMarks: 2,
  })!
  assert.equal(all.headline, 'You lost 2 marks — all of them to conceptual error.')

  // One slip is not a pattern. This is the guard against fabricating a trend
  // from a single data point, which is the fastest way to get caught.
  const single = buildPostMarkDiagnosis({
    marksAwarded: [won(), lost('arithmetic')],
    marksEarned: 1,
    totalMarks: 2,
  })!
  assert.equal(single.pattern, null)
  assert.equal(single.headline, 'You lost 1 mark on this question.')
  assert.equal(single.detail, '')

  // An even split is not a dominant pattern either: 2 vs 2 fails the
  // "at least half" test only if we required a strict majority — it passes at
  // exactly half by design, since two of four is still the largest group and
  // naming it is honest. Three-way ties of 1 each stay unnamed via MIN_COUNT.
  const evenSplit = buildPostMarkDiagnosis({
    marksAwarded: [lost('arithmetic'), lost('arithmetic'), lost('conceptual'), lost('conceptual')],
    marksEarned: 0,
    totalMarks: 4,
  })!
  assert.equal(evenSplit.pattern?.count, 2)

  const scattered = buildPostMarkDiagnosis({
    marksAwarded: [lost('arithmetic'), lost('conceptual'), lost('incomplete')],
    marksEarned: 0,
    totalMarks: 3,
  })!
  assert.equal(scattered.pattern, null, 'one of each is not a pattern')

  // Unclassified losses (model returned nothing, or 'no_error' on a lost mark)
  // must not be counted as evidence — they are absence of data, not a finding.
  const unclassified = buildPostMarkDiagnosis({
    marksAwarded: [lost(null), lost('no_error'), lost('garbage-value')],
    marksEarned: 0,
    totalMarks: 3,
  })!
  assert.equal(unclassified.pattern, null)
  assert.equal(unclassified.headline, 'You lost 3 marks on this question.')

  // Singular/plural.
  const one = buildPostMarkDiagnosis({
    marksAwarded: [won()],
    marksEarned: 4,
    totalMarks: 5,
  })!
  assert.ok(one.headline.includes('1 mark on'), one.headline)

  // The copy must never catastrophise — no failure language anywhere in the
  // generated strings, whatever the score.
  const wipeout = buildPostMarkDiagnosis({
    marksAwarded: [lost('conceptual'), lost('conceptual'), lost('conceptual')],
    marksEarned: 0,
    totalMarks: 3,
  })!
  const text = `${wipeout.headline} ${wipeout.detail}`.toLowerCase()
  for (const banned of ['fail', 'failing', 'behind', 'bad', 'poor', 'worst']) {
    assert.ok(!text.includes(banned), `post-mark copy must not say "${banned}": ${text}`)
  }

  console.log('post-mark-ask tests passed')
}

main()
