import assert from 'node:assert/strict'
import { reconcileMarkResult } from './reconcile-marks'

// --- IB criteria: model mis-sums; per-criterion catalog maxima are authoritative ---
{
  const result: Record<string, unknown> = {
    criteria_results: [
      { criterion: 'A', marks_awarded: 5, marks_available: 6 },
      { criterion: 'B', marks_awarded: 4, marks_available: 5 },
    ],
    band_result: { marks_awarded: 8, marks_available: 11 }, // model got the sum wrong (8 ≠ 9)
    marks_earned: 8,
    total_marks: 11,
  }
  const out = reconcileMarkResult(result, {
    criterionMax: [
      { letter: 'A', maxMarks: 6 },
      { letter: 'B', maxMarks: 5 },
    ],
  })
  assert.equal(out.marks_earned, 9, 'earned = sum of criteria (5+4)')
  assert.equal(out.total_marks, 11, 'total = sum of catalog maxima (6+5)')
  assert.deepEqual(
    (out.band_result as Record<string, unknown>),
    { marks_awarded: 9, marks_available: 11 },
    'band roll-up synced to criterion sum'
  )
}

// --- IB criteria: a criterion award above its band max is clamped ---
{
  const result: Record<string, unknown> = {
    criteria_results: [{ criterion: 'A', marks_awarded: 9, marks_available: 6 }],
    marks_earned: 9,
    total_marks: 6,
  }
  const out = reconcileMarkResult(result, {
    criterionMax: [{ letter: 'A', maxMarks: 6 }],
  })
  assert.equal((out.criteria_results as Record<string, unknown>[])[0].marks_awarded, 6, 'award clamped to band max')
  assert.equal(out.marks_earned, 6, 'earned clamped')
  assert.equal(out.total_marks, 6, 'total from catalog')
}

// --- M4: model OMITS a catalog criterion → total from full catalog, omitted zero-filled ---
{
  const result: Record<string, unknown> = {
    criteria_results: [{ criterion: 'A', marks_awarded: 5, marks_available: 6 }], // B missing
    marks_earned: 5,
    total_marks: 6, // model scored out of only the criterion it returned
  }
  const out = reconcileMarkResult(result, {
    criterionMax: [
      { letter: 'A', maxMarks: 6 },
      { letter: 'B', maxMarks: 5 },
    ],
  })
  assert.equal(out.total_marks, 11, 'total from FULL catalog (6+5), not just returned criteria')
  assert.equal(out.marks_earned, 5, 'earned = A only; B zero-filled')
  assert.equal((out.criteria_results as Record<string, unknown>[]).length, 2, 'omitted criterion surfaced')
  assert.equal((out.criteria_results as Record<string, unknown>[])[1].marks_awarded, 0, 'B zero-filled')
}

// --- M4: model returns an EXTRA criterion not in the catalog → ignored ---
{
  const result: Record<string, unknown> = {
    criteria_results: [
      { criterion: 'A', marks_awarded: 6, marks_available: 6 },
      { criterion: 'Z', marks_awarded: 9, marks_available: 9 }, // not in catalog
    ],
    marks_earned: 15,
    total_marks: 15,
  }
  const out = reconcileMarkResult(result, {
    criterionMax: [{ letter: 'A', maxMarks: 6 }],
  })
  assert.equal(out.total_marks, 6, 'extra criterion Z excluded from denominator')
  assert.equal(out.marks_earned, 6, 'extra criterion Z excluded from earned')
}

// --- Level-of-response: earned tracks the band mark, total from authoritative scheme ---
{
  const result: Record<string, unknown> = {
    band_result: { level: 3, marks_awarded: 12, marks_available: 9 },
    marks_earned: 12,
    total_marks: 9,
  }
  const out = reconcileMarkResult(result, { authoritativeTotal: 15 })
  assert.equal(out.total_marks, 15, 'total from authoritative scheme')
  assert.equal(out.marks_earned, 12, 'earned = band mark, within total')
  assert.equal((out.band_result as Record<string, unknown>).marks_available, 15, 'band available synced')
}

// --- Points: authoritative total overrides model guess; earned scaled (M3) ---
{
  const result: Record<string, unknown> = {
    marks_awarded: [{ type: 'M1', earned: true }],
    marks_earned: 7,
    total_marks: 10, // model guessed 10; real paper total is 5
  }
  const out = reconcileMarkResult(result, { authoritativeTotal: 5 })
  assert.equal(out.total_marks, 5, 'total overridden to authoritative')
  // M3: scaled to preserve the 7/10 ratio (round(7*5/10)=4), not clamped to 5/5.
  assert.equal(out.marks_earned, 4, 'earned scaled, not a fabricated perfect score')
}

// --- M3: model marked against a larger total → scale, don't fabricate a perfect score ---
{
  const result: Record<string, unknown> = {
    marks_awarded: [{ type: 'M1', earned: true }],
    marks_earned: 7,
    total_marks: 10, // model marked out of 10
  }
  const out = reconcileMarkResult(result, { authoritativeTotal: 6 })
  assert.equal(out.total_marks, 6, 'total set to authoritative')
  assert.equal(out.marks_earned, 4, 'earned scaled 7*6/10≈4, not clamped to 6/6')
}

// --- M3 regression: model over-stated the total but earned <= authoritative.
// The old `earned > authoritative` guard skipped scaling here, so 5/10 showed a
// fabricated 5/5 (100%) while 6/10 showed 3/5 (60%) — a score that DROPPED as the
// student earned more. Scaling must apply across the whole over-stated region. ---
{
  const five = reconcileMarkResult(
    { marks_awarded: [], marks_earned: 5, total_marks: 10 },
    { authoritativeTotal: 5 }
  )
  assert.equal(five.total_marks, 5)
  assert.equal(five.marks_earned, 3, '5/10 → round(2.5)=3 out of 5, not a fabricated 5/5')

  const six = reconcileMarkResult(
    { marks_awarded: [], marks_earned: 6, total_marks: 10 },
    { authoritativeTotal: 5 }
  )
  assert.equal(six.marks_earned, 3, '6/10 → 3/5 — never below the 5/10 result')

  // Monotonic: more earned (on the same model scale) never yields a lower score.
  for (let e = 0; e <= 10; e++) {
    const prev = reconcileMarkResult(
      { marks_awarded: [], marks_earned: Math.max(0, e - 1), total_marks: 10 },
      { authoritativeTotal: 5 }
    ).marks_earned as number
    const cur = reconcileMarkResult(
      { marks_awarded: [], marks_earned: e, total_marks: 10 },
      { authoritativeTotal: 5 }
    ).marks_earned as number
    assert.ok(cur >= prev, `earned ${e} must not score below earned ${e - 1}`)
  }
}

// --- M3 for level-of-response: model marked a band against a larger scale than
// the authoritative total → scale, don't clamp to a fabricated perfect. ---
{
  const out = reconcileMarkResult(
    {
      band_result: { level: 4, marks_awarded: 12, marks_available: 15 },
      marks_earned: 12,
      total_marks: 15,
    },
    { authoritativeTotal: 9 }
  )
  assert.equal(out.total_marks, 9, 'total from authoritative scheme')
  assert.equal(out.marks_earned, 7, '12/15 → round(7.2)=7 out of 9, not 9/9')
  assert.equal(
    (out.band_result as Record<string, unknown>).marks_awarded,
    7,
    'band roll-up scaled too'
  )
}

// --- Points: unknown total leaves model output untouched apart from clamp ---
{
  const result: Record<string, unknown> = {
    marks_awarded: [{ type: 'B1', earned: true }],
    marks_earned: 3,
    total_marks: 4,
  }
  const out = reconcileMarkResult(result, {})
  assert.equal(out.total_marks, 4, 'unknown total: keep model total')
  assert.equal(out.marks_earned, 3, 'earned unchanged when within total')
}

console.log('reconcile-marks: all assertions passed')
