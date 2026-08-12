/**
 * The demo student — a seeded account for /demo.
 *
 * Why this exists: every paid surface in the product (mastery matrix, grade
 * trajectory, predicted grade, weak-spot drills, the Sunday report) is computed
 * from `attempts`. A reader with no attempts therefore sees an *empty* premium
 * feature no matter how it is presented, and so does a subscriber on day one.
 * The paid half of the product is invisible by construction until roughly ten
 * questions have been marked, which is why the gates could only ever describe
 * it — "live diagrams, drag the controls" — rather than show it.
 *
 * So: seed the input, not the output. Everything on /demo is derived by the
 * same functions the real dashboard calls — `calculateParentMastery`,
 * `predictGrade`, `analysePatterns`, `generateActionPlan`. Nothing here is a
 * screenshot or a hand-written mastery object, which means the demo cannot
 * drift away from the product: if the mastery thresholds change, this page
 * changes with them.
 *
 * The same pattern is already used by `FirstMarkPreview` (real `ScoreReveal` +
 * `DEMO_MARK_RESULT`) for the free half of the funnel. This is that idea
 * carried across the paywall.
 *
 * Honesty rules, which the UI must keep:
 *   - This is labelled as an example everywhere it appears. It is never
 *     presented as the reader's own data.
 *   - No real student's work is reproduced. The questions are written for this
 *     fixture against the published 9709 syllabus.
 *   - The numbers are unflattering where a real account would be. Two topics
 *     sit in Needs work, and the trajectory dips twice. A demo that shows only
 *     improvement is an advert; one that shows a real diagnosis is the product.
 */

import type { AttemptLite } from '@/lib/mastery'
import type { ErrorClassificationDetail } from '@/lib/error-classifications'

/** Cambridge 9709 — the subject with the fullest analytics stack behind it. */
export const DEMO_SUBJECT_CODE = '9709'

export const DEMO_STUDENT = {
  firstName: 'Aisha',
  /**
   * Cambridge rather than IB deliberately. `GradeTrajectory` renders a real
   * predicted grade against A*–E boundaries for letter-grade boards, and falls
   * back to "1–7 estimate coming soon" for IB. A demo whose centrepiece says
   * "coming soon" argues against the thing it is selling. When the IB band
   * estimate ships, add an IB variant of this fixture and let the reader switch.
   */
  board: 'Cambridge International',
  boardLabel: 'Cambridge',
  level: 'A-Level',
  subjectCode: DEMO_SUBJECT_CODE,
  subjectLabel: 'Mathematics',
  /** Set in onboarding on a real account; 4.7% of live accounts have one. */
  targetGrade: 'A',
  /** Oct/Nov 2026 series — the next real sitting after this fixture was written. */
  examDateIso: '2026-10-26',
  examLabel: 'Paper 1 · Oct/Nov 2026',
} as const

/**
 * One seeded attempt, before it is stamped with a date.
 *
 * `daysAgo` is resolved against render time so the demo always reads as a
 * currently-active student rather than a snapshot that ages. The page sets
 * `revalidate` so this is recomputed periodically rather than per request.
 */
type AttemptSpec = {
  id: string
  tag: string
  earned: number
  total: number
  daysAgo: number
  minutes: number
  question: string
  errors?: ErrorClassificationDetail[]
}

/**
 * Eighteen attempts across seven weeks, ordered newest-first to match the
 * `attempts` query the real dashboard runs (`order created_at desc`).
 *
 * The spread is designed so the production thresholds in `lib/mastery.ts`
 * (3 attempts for confidence, <40% critical, ≥75% exam-ready) resolve to a
 * mastery map that is worth looking at rather than uniformly green:
 *
 *   1.7 Differentiation   3 attempts · 22/26 · 85%  → Exam ready
 *   1.8 Integration       3 attempts · 21/29 · 72%  → Proficient
 *   1.5 Trigonometry      3 attempts · 16/26 · 62%  → Proficient
 *   3.8 Differential eqs  3 attempts ·  7/21 · 33%  → Needs work  ← the story
 *   3.9 Complex numbers   3 attempts ·  8/21 · 38%  → Needs work
 *   1.6 Series            2 attempts             → Too few attempts
 *   1.3 Coordinate geom   1 attempt              → Too few attempts
 *   everything else                              → Not started
 *
 * The recent-10 average lands at ~65.5%, which `predictGrade` reads as a B
 * against a target of A — a gap of about five points. That is the goal-gradient
 * number the whole page is built around, and `nextLevelTip` then names
 * Differential equations as the topic that closes it. None of that is written
 * here; it falls out of the arithmetic.
 */
const ATTEMPT_SPECS: AttemptSpec[] = [
  {
    id: 'demo-attempt-01',
    tag: '1.7',
    earned: 9,
    total: 10,
    daysAgo: 1,
    minutes: 11,
    question:
      'A curve has equation y = 2x³ − 15x² + 24x + 3. Find the coordinates of each stationary point and determine its nature. [10]',
    errors: [
      {
        classification: 'arithmetic',
        mark_id: 'A1',
        description: 'Second derivative evaluated correctly but the sign was misread at x = 4.',
      },
    ],
  },
  {
    id: 'demo-attempt-02',
    tag: '1.8',
    earned: 8,
    total: 10,
    daysAgo: 3,
    minutes: 14,
    question:
      'Find the exact area of the region bounded by the curve y = 4/√x, the x-axis and the lines x = 1 and x = 9. [10]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Integration correct, but the answer was left unevaluated at the limits.',
      },
      {
        classification: 'incomplete',
        mark_id: 'B1',
        description: 'No final exact value stated.',
      },
    ],
  },
  {
    id: 'demo-attempt-03',
    tag: '3.8',
    earned: 3,
    total: 8,
    daysAgo: 5,
    minutes: 19,
    question:
      'Solve the differential equation dy/dx = 2y cos²x, given that y = 1 when x = 0. Express y in terms of x. [8]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Variables were not fully separated before integrating.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Constant of integration found but never substituted back.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Answer left implicit rather than solved for y.',
      },
    ],
  },
  {
    id: 'demo-attempt-04',
    tag: '1.7',
    earned: 7,
    total: 8,
    daysAgo: 7,
    minutes: 10,
    question:
      'The volume of a cone is increasing at 3 cm³ s⁻¹. Find the rate of increase of the radius when r = 5 cm. [8]',
    errors: [
      {
        classification: 'arithmetic',
        mark_id: 'A1',
        description: 'Chain rule applied correctly; a factor of π was dropped in the final line.',
      },
    ],
  },
  {
    id: 'demo-attempt-05',
    tag: '1.5',
    earned: 6,
    total: 9,
    daysAgo: 9,
    minutes: 13,
    question:
      'Solve 3 sin²θ + 2 cos θ = 2 for 0° ≤ θ ≤ 360°. [9]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'The Pythagorean identity was applied in the wrong direction.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Only two of the four solutions in range were given.',
      },
    ],
  },
  {
    id: 'demo-attempt-06',
    tag: '1.8',
    earned: 7,
    total: 10,
    daysAgo: 12,
    minutes: 16,
    question:
      'Use the substitution u = 1 + 2x to find ∫ x(1 + 2x)⁵ dx. [10]',
    errors: [
      {
        classification: 'algebraic_sign',
        mark_id: 'M1',
        description: 'Sign error when rearranging x in terms of u.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Result not returned to the original variable.',
      },
    ],
  },
  {
    id: 'demo-attempt-07',
    tag: '3.9',
    earned: 3,
    total: 8,
    daysAgo: 14,
    minutes: 21,
    question:
      'The complex number z satisfies |z − 3i| = |z + 2|. Show that the locus of z is a straight line and find its equation. [8]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Modulus interpreted as distance from the origin rather than between points.',
      },
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Perpendicular-bisector property not identified.',
      },
    ],
  },
  {
    id: 'demo-attempt-08',
    tag: '1.7',
    earned: 6,
    total: 8,
    daysAgo: 16,
    minutes: 12,
    question:
      'Find the equation of the normal to the curve y = x² ln x at the point where x = 1. [8]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Gradient of the normal found but the line equation was not written out.',
      },
    ],
  },
  {
    id: 'demo-attempt-09',
    tag: '1.5',
    earned: 5,
    total: 9,
    daysAgo: 19,
    minutes: 15,
    question:
      'Express 5 sin θ − 12 cos θ in the form R sin(θ − α), and hence solve the equation for 0 ≤ θ ≤ 2π. [9]',
    errors: [
      {
        classification: 'algebraic_sign',
        mark_id: 'A1',
        description: 'α found from the wrong quadrant.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Second solution in range omitted.',
      },
    ],
  },
  {
    id: 'demo-attempt-10',
    tag: '1.6',
    earned: 5,
    total: 9,
    daysAgo: 21,
    minutes: 14,
    question:
      'The first three terms of a geometric progression are 2k + 3, k + 6 and k. Find the two possible values of k. [9]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Quadratic formed correctly but only one root was reported.',
      },
    ],
  },
  {
    id: 'demo-attempt-11',
    tag: '3.8',
    earned: 2,
    total: 7,
    daysAgo: 24,
    minutes: 18,
    question:
      'A population P satisfies dP/dt = kP(100 − P). Given P = 20 when t = 0, find P in terms of t. [7]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Partial fractions not used before integrating.',
      },
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Working stopped at the implicit form.',
      },
    ],
  },
  {
    id: 'demo-attempt-12',
    tag: '3.9',
    earned: 3,
    total: 7,
    daysAgo: 27,
    minutes: 17,
    question:
      'Find the two square roots of the complex number 5 + 12i, giving answers in the form a + bi. [7]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Real and imaginary parts were not equated separately.',
      },
    ],
  },
  {
    id: 'demo-attempt-13',
    tag: '1.8',
    earned: 6,
    total: 9,
    daysAgo: 30,
    minutes: 15,
    question:
      'The region under y = sin 2x between x = 0 and x = π/2 is rotated about the x-axis. Find the exact volume. [9]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Double-angle substitution correct; the final exact value was not simplified.',
      },
    ],
  },
  {
    id: 'demo-attempt-14',
    tag: '1.5',
    earned: 5,
    total: 8,
    daysAgo: 33,
    minutes: 12,
    question:
      'Prove the identity (1 + cos 2θ)/(sin 2θ) ≡ cot θ. [8]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Left-hand side simplified but the identity was never formally concluded.',
      },
    ],
  },
  {
    id: 'demo-attempt-15',
    tag: '3.9',
    earned: 2,
    total: 6,
    daysAgo: 36,
    minutes: 16,
    question:
      'Sketch on an Argand diagram the set of points satisfying arg(z − 1 + i) = π/4. [6]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Half-line drawn from the origin instead of from 1 − i.',
      },
    ],
  },
  {
    id: 'demo-attempt-16',
    tag: '1.6',
    earned: 4,
    total: 8,
    daysAgo: 40,
    minutes: 13,
    question:
      'Find the coefficient of x³ in the expansion of (2 − x/2)⁸. [8]',
    errors: [
      {
        classification: 'algebraic_sign',
        mark_id: 'A1',
        description: 'The sign of the odd-power term was lost.',
      },
      {
        classification: 'arithmetic',
        mark_id: 'A1',
        description: 'Binomial coefficient evaluated incorrectly.',
      },
    ],
  },
  {
    id: 'demo-attempt-17',
    tag: '3.8',
    earned: 2,
    total: 6,
    daysAgo: 44,
    minutes: 20,
    question:
      'Find the general solution of dy/dx + 2y = e⁻ˣ. [6]',
    errors: [
      {
        classification: 'conceptual',
        mark_id: 'M1',
        description: 'Integrating factor not identified.',
      },
    ],
  },
  {
    id: 'demo-attempt-18',
    tag: '1.3',
    earned: 4,
    total: 8,
    daysAgo: 48,
    minutes: 11,
    question:
      'The line y = 2x + c is a tangent to the circle x² + y² − 6x + 4y = 12. Find the possible values of c. [8]',
    errors: [
      {
        classification: 'incomplete',
        mark_id: 'A1',
        description: 'Discriminant set to zero but only one value of c was solved for.',
      },
    ],
  },
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Resolve the fixture into `AttemptLite[]`, newest-first, dated back from
 * `now`. Deterministic for a given `now` so the page can be statically
 * generated and revalidated rather than rendered per request.
 */
export function buildDemoAttempts(now: Date = new Date()): AttemptLite[] {
  const base = now.getTime()
  return ATTEMPT_SPECS.map((spec) => ({
    id: spec.id,
    marks_earned: spec.earned,
    total_marks: spec.total,
    syllabus_tags: [spec.tag],
    created_at: new Date(base - spec.daysAgo * DAY_MS).toISOString(),
    time_spent_seconds: spec.minutes * 60,
    question_text: spec.question,
    source_type: 'past_paper',
    error_classifications: spec.errors ?? null,
  }))
}

/** Whole days from `now` to the demo student's next paper. Never negative. */
export function demoDaysToExam(now: Date = new Date()): number {
  const exam = new Date(`${DEMO_STUDENT.examDateIso}T00:00:00Z`).getTime()
  return Math.max(0, Math.ceil((exam - now.getTime()) / DAY_MS))
}

/** Total marks earned across the seeded history — used in the persona header. */
export function demoMarksEarned(attempts: AttemptLite[]): number {
  return attempts.reduce((sum, a) => sum + a.marks_earned, 0)
}
