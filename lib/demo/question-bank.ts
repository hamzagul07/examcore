/**
 * The question desk, for /demo.
 *
 * On a real Max account `loadVaultQuestionBanks()` fills this from the
 * `mark_schemes` table — real Cambridge questions, pulled for the topics the
 * student is weakest at. These are written for the fixture instead, for the
 * same reason `DEMO_MARK_RESULT` is hand-written rather than a snapshot: /demo
 * is a public, indexable page, and serving verbatim board question text from one
 * is a materially wider exposure than serving it to a signed-in student behind
 * /api/mark. They are written to the published 9709 syllabus in the style and
 * mark-allocation conventions of the paper, so the desk looks and reads like the
 * real thing without reproducing it.
 *
 * The topics are not arbitrary: they are the two the seeded student is weakest
 * at (3.8 and 3.9, both "Needs work" on her map). That is what the desk actually
 * does — it is a queue built from the weak-topic map, not a browsable index —
 * and the demo should show that rather than a generic list of questions.
 */

export type DemoBankPart = {
  /** (a), (b), (i) … — omitted on single-part questions. */
  label?: string
  text: string
  marks: number
}

export type DemoBankQuestion = {
  id: string
  number: number
  topicCode: string
  topicLabel: string
  parts: DemoBankPart[]
  /** Why this one is in the queue, in the desk's own voice. */
  reason: string
}

export const DEMO_BANK_PAPER = {
  code: '9709/32',
  name: 'Pure Mathematics 3',
  level: 'Cambridge International A Level',
  duration: '1 hour 50 minutes',
  session: 'Oct/Nov 2026',
} as const

export const DEMO_BANK_QUESTIONS: DemoBankQuestion[] = [
  {
    id: 'demo-bank-1',
    number: 1,
    topicCode: '3.8',
    topicLabel: 'Differential equations',
    reason: 'Separating the variables is the step you have dropped in all three attempts.',
    parts: [
      {
        label: '(a)',
        text: 'Show that the substitution u = y/x transforms the equation x·dy/dx = y + x·tan(y/x) into an equation in which the variables u and x may be separated.',
        marks: 3,
      },
      {
        label: '(b)',
        text: 'Hence solve the equation, given that y = ¼π when x = 1, expressing your answer in the form y = f(x).',
        marks: 6,
      },
    ],
  },
  {
    id: 'demo-bank-2',
    number: 2,
    topicCode: '3.8',
    topicLabel: 'Differential equations',
    reason: 'Two of your three attempts stopped at the implicit form without solving for the variable.',
    parts: [
      {
        text: 'The rate at which a chemical dissolves is proportional to the mass m grams still undissolved. Initially 60 g are present, and after 20 minutes 45 g remain undissolved. Find the time taken for the mass remaining to fall to 15 g, giving your answer to the nearest minute.',
        marks: 7,
      },
    ],
  },
  {
    id: 'demo-bank-3',
    number: 3,
    topicCode: '3.9',
    topicLabel: 'Complex numbers',
    reason: 'Loci questions are where this topic keeps costing you marks — you read the modulus as a distance from the origin.',
    parts: [
      {
        label: '(a)',
        text: 'On a single Argand diagram, sketch the locus of points representing complex numbers z satisfying |z − 2 + i| = 2.',
        marks: 3,
      },
      {
        label: '(b)',
        text: 'Determine the greatest and least values of |z| for points on this locus, giving each answer in exact form.',
        marks: 4,
      },
    ],
  },
  {
    id: 'demo-bank-4',
    number: 4,
    topicCode: '3.9',
    topicLabel: 'Complex numbers',
    reason: 'You have not attempted a roots-of-unity question yet, and it is on every recent paper.',
    parts: [
      {
        text: 'The complex number w is such that w³ = −8i. Find the three possible values of w, giving each in the form r(cos θ + i sin θ) where r > 0 and −π < θ ≤ π.',
        marks: 6,
      },
    ],
  },
]

/** Total marks on the desk — shown in the paper header, computed not typed. */
export function demoBankTotalMarks(): number {
  return DEMO_BANK_QUESTIONS.reduce(
    (sum, q) => sum + q.parts.reduce((s, p) => s + p.marks, 0),
    0
  )
}
