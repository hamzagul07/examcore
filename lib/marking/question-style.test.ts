import assert from 'node:assert/strict'
import {
  looksLikeExtendedResponse,
  buildGenericBandScale,
  EXTENDED_RESPONSE_MIN_MARKS,
} from '@/lib/marking/question-style'

/**
 * Which questions get banded instead of point-hunted.
 *
 * Pinned against the run that exposed the bug: attempt 28eb8188, a 12-mark
 * "Evaluate the view that the introduction of a national minimum wage will
 * always reduce employment", answered competently, marked `point_based`
 * against 12 derived award points, scored 0/12.
 */
function main() {
  const es = (questionText: string, totalMarks: number | null, subjectCode?: string) =>
    looksLikeExtendedResponse({ questionText, totalMarks, subjectCode })

  // --- the regression ---------------------------------------------------------
  assert.equal(
    es(
      'Evaluate the view that the introduction of a national minimum wage will always reduce employment.',
      12,
      '9708'
    ),
    true,
    'the 12-mark evaluate essay that scored 0/12 must now be banded'
  )

  // --- other genuine extended responses ---------------------------------------
  for (const q of [
    'Discuss whether monetary policy is more effective than fiscal policy.',
    'To what extent was the League of Nations a failure?',
    'Assess the importance of leadership style to business performance.',
    'Examine the impact of globalisation on developing economies.',
    'How far do you agree that market failure justifies government intervention?',
  ]) {
    assert.equal(es(q, 12, '9708'), true, `should band: ${q.slice(0, 40)}…`)
  }

  // --- short-answer must stay point-based -------------------------------------
  // "Explain" is the commonest point-based command term; treating it as an essay
  // would flip a large share of ordinary marking to banding.
  assert.equal(
    es('Explain why water is a polar molecule.', 4, '9701'),
    false,
    'a 4-mark explain is point-based'
  )
  assert.equal(
    es('State two reasons why a firm might relocate.', 2, '9708'),
    false
  )
  assert.equal(
    es('Discuss briefly one advantage of this method.', 3, '9708'),
    false,
    `below ${EXTENDED_RESPONSE_MIN_MARKS} marks an evaluative verb is still a short answer`
  )

  // --- maths never bands -------------------------------------------------------
  // "Justify" after a derivation is a method mark; banding would lose the working.
  assert.equal(
    es('Justify that the stationary point is a minimum.', 8, '9709'),
    false,
    'maths stays point-based whatever the command term'
  )

  // --- an unknown tariff declines rather than guesses ---------------------------
  assert.equal(
    es('Evaluate the effectiveness of this policy.', null, '9708'),
    false,
    'without a denominator we cannot tell a 2-mark discuss from a 20-mark essay'
  )
  assert.equal(es('', 12, '9708'), false, 'no question text, no judgement')

  // --- the generic scale --------------------------------------------------------
  const scale = buildGenericBandScale(12) as {
    source: string
    bands: { level: number; marks: string }[]
  }
  assert.equal(
    scale.source,
    'generic_band_scale',
    'the marker must be able to tell this from a published scheme'
  )
  const bands = scale.bands
  assert.equal(bands[0].marks, '0')
  // Bands must cover the tariff with no gap and no overlap, or the model is
  // asked to place a response in a range that does not exist.
  const top = bands[bands.length - 1].marks
  assert.ok(top.endsWith('12'), `top band must reach the tariff, got ${top}`)

  // Every tariff must yield bands that are contiguous, non-overlapping and
  // cover 0..total exactly. Checking only that each range is internally valid
  // let a real defect through: at total 2 the scale produced L1=1, L2=1, L3=2,
  // L4=2 — two pairs of bands claiming the same mark, so the model would be
  // asked to place one response in two bands at once.
  for (let total = 1; total <= 40; total++) {
    const s = buildGenericBandScale(total) as { bands: { marks: string }[] }
    let expectedLow = 0
    for (const b of s.bands) {
      const parts = b.marks.split('-').map(Number)
      const lo = parts[0]
      const hi = parts.length > 1 ? parts[1] : parts[0]
      assert.ok(lo <= hi, `band inverted at total ${total}: ${b.marks}`)
      assert.equal(
        lo,
        expectedLow,
        `band gap or overlap at total ${total}: expected ${expectedLow}, got ${b.marks}`
      )
      expectedLow = hi + 1
    }
    assert.equal(
      expectedLow - 1,
      total,
      `bands must reach exactly ${total}, stopped at ${expectedLow - 1}`
    )
  }

  console.log('question-style.test.ts: ok')
}

main()
