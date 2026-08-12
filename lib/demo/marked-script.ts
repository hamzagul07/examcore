/**
 * The demo student's marked script — the same fixture the free preview uses,
 * plus the paid layer attached.
 *
 * `DEMO_MARK_RESULT` is what a free reader gets today: the ink, the per-mark
 * reasoning, the margin note on the mark that was lost. That stays free and is
 * deliberately not gated — it is the moment that makes anyone want the rest, and
 * gating it would remove the reason to buy (see the additive-only note in
 * `lib/billing/features.ts`).
 *
 * What paid adds is the *route*: `full_marks_rewrite`, an annotated version of
 * the student's own answer taken to full marks, with each addition labelled by
 * the mark it earns. Rather than restate the whole fixture, this spreads the
 * free one and attaches the paid half — so the demo shows exactly the delta a
 * subscription buys, and the two can never drift apart.
 */

import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'
import type { MarkingResultData } from '@/components/MarkingResultView'

export const DEMO_MARK_RESULT_PAID: MarkingResultData = {
  ...DEMO_MARK_RESULT,
  ai_marking: {
    ...DEMO_MARK_RESULT.ai_marking,
    /**
     * The B1 that was lost was lost for asserting the nature of each stationary
     * point without justifying it. The rewrite therefore changes exactly one
     * thing — it shows the second-derivative test — and leaves the four earned
     * marks alone. A rewrite that silently improves work the student already got
     * right teaches nothing about where the mark actually went.
     */
    full_marks_rewrite: {
      rewritten_answer: [
        'dy/dx = 3x² − 12x + 9',
        '',
        '3x² − 12x + 9 = 0',
        'x² − 4x + 3 = 0',
        '(x − 1)(x − 3) = 0',
        'x = 1 or x = 3',
        '',
        'When x = 1, y = 1 − 6 + 9 + 1 = 5',
        'When x = 3, y = 27 − 54 + 27 + 1 = 1',
        'Stationary points are (1, 5) and (3, 1).',
        '',
        'd²y/dx² = 6x − 12',
        '',
        'At x = 1: d²y/dx² = 6(1) − 12 = −6 < 0, so (1, 5) is a maximum.',
        'At x = 3: d²y/dx² = 6(3) − 12 = +6 > 0, so (3, 1) is a minimum.',
      ].join('\n'),
      annotations: [
        {
          earns: 'B1',
          text: 'The three lines from **d²y/dx² = 6x − 12** onwards are the whole difference. Your conclusion was already right — the examiner is paying for the justification, not the answer.',
        },
        {
          earns: 'Method',
          text: 'Evaluating the second derivative **at each x-value separately** and stating the sign is what turns an assertion into a proof. A sign-change argument on dy/dx either side of each point would earn the same mark.',
        },
        {
          earns: 'Kept',
          text: 'Everything above the rule is unchanged from your script. Four of the five marks were already yours.',
        },
      ],
    },
  },
}
