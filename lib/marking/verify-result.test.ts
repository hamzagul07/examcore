import assert from 'node:assert/strict'
import { coerceMarkingResult } from './normalize-math'
import { reconcileMarkResult } from './reconcile-marks'
import { isCompleteComparableVerifyResult } from './verify-result'

// A fluent summary used to pass the general usability check, acquire a coerced
// zero, and replace a correct 7/8. It must leave the first pass untouched.
{
  const firstPass = reconcileMarkResult(
    {
      marks_awarded: Array.from({ length: 8 }, (_, index) => ({
        type: `M${index + 1}`,
        earned: index < 7,
      })),
      marks_earned: 7,
      total_marks: 8,
      summary: 'Seven valid marking points were earned.',
    },
    { authoritativeTotal: 8 }
  )
  const summaryOnly = reconcileMarkResult(
    coerceMarkingResult({ summary: 'Strong answer overall.' }),
    { authoritativeTotal: 8 }
  )

  let finalResult: Record<string, unknown> = firstPass
  if (isCompleteComparableVerifyResult(firstPass, summaryOnly, 'point_based')) {
    finalResult = summaryOnly
  }

  assert.equal(finalResult.marks_earned, 7, 'summary-only verify must keep 7/8')
  assert.equal(finalResult.total_marks, 8)
}

// A shorter tick list is not a comparable re-mark even when it has a headline.
{
  const firstPass = {
    marks_awarded: Array.from({ length: 3 }, () => ({ earned: true })),
    marks_earned: 3,
    total_marks: 3,
  }
  assert.equal(
    isCompleteComparableVerifyResult(
      firstPass,
      {
        marks_awarded: [{ earned: true }],
        marks_earned: 1,
        total_marks: 3,
      },
      'point_based'
    ),
    false
  )
}

// Level and IB criteria verification must carry their style-specific decision.
{
  assert.equal(
    isCompleteComparableVerifyResult(
      { band_result: { marks_awarded: 5 }, marks_earned: 5 },
      { band_result: { marks_awarded: 6 }, marks_earned: 6 },
      'level_of_response'
    ),
    true
  )
  assert.equal(
    isCompleteComparableVerifyResult(
      {
        criteria_results: [
          { criterion: 'A', marks_awarded: 5 },
          { criterion: 'B', marks_awarded: 4 },
        ],
        marks_earned: 9,
      },
      {
        criteria_results: [{ criterion: 'A', marks_awarded: 6 }],
        marks_earned: 6,
      },
      'level_of_response'
    ),
    false,
    'a verifier that omits criterion B is incomplete'
  )
}

console.log('verify-result: all assertions passed')
