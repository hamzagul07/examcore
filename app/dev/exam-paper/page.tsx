'use client'

import { ExamPaperQuestion, ExamPaperRubric, ExamPaperSheet } from '@/components/exam-paper/ExamPaper'
import { PracticeSection } from '@/components/courses/margin-notes/lesson-blocks'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'

/** Just enough lesson for PracticeSection; the real type is far larger. */
const PRACTICE_LESSON = {
  code: '9702',
  sub: 'Physics',
  point: '1.3',
  name: 'Errors and uncertainties',
  outline: false,
  practiceQuestions: [
    {
      ref: '9702/52 · February/March 2024 · Q1',
      marks: 4,
      text: 'A student uses a metre rule to measure the length $L$ of a pendulum and a stopwatch to time 10 oscillations. State and explain two ways the student could reduce the uncertainty in the measured period. [4]',
      href: '/mark?subject=9702&paper=9702%2F52&session=m24&question=1',
      paperCode: '9702/52',
      session: 'February/March 2024',
      questionNumber: '1',
      markPoints: [
        { text: 'Time a larger number of oscillations so the reaction-time error is a smaller fraction', marks: 2 },
        { text: 'Repeat the timing and take a mean', marks: 2 },
      ],
    },
    {
      ref: '9702/52 · February/March 2024 · Q2(b)',
      marks: 2,
      text: 'Calculate the percentage uncertainty in $T^2$ given $T = 1.42 \\pm 0.02\\,\\text{s}$.',
      href: '/mark?subject=9702&paper=9702%2F52&session=m24&question=2(b)',
      paperCode: '9702/52',
      session: 'February/March 2024',
      questionNumber: '2(b)',
    },
  ],
} as unknown as MarginNotesLesson

/**
 * Dev preview for the exam-paper question renderer: a multi-part question with
 * inline marks, a flat leaf sub-part with a whole-question total, an MCQ-style
 * stem, and a compact variant. Fixture text only — nothing verbatim from a
 * board paper.
 */
const MULTI = `The curve $C$ has equation $y = x^3 - 6x^2 + 9x + 2$.

(a) Find $\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}$. [2]

(b) Hence find the coordinates of the stationary points of $C$. [3]

(c) Determine the nature of each stationary point. [2]`

const LEAF =
  'A ball of mass 0.20 kg is released from rest at a height of 1.8 m above the ground. Air resistance is negligible. Calculate the speed of the ball just before it reaches the ground.'

const DATA = `A student measures the terminal potential difference $V$ across a cell for different currents $I$. The results are shown in the table.

| $I$ / A | 0.10 | 0.20 | 0.30 | 0.40 |
|---|---|---|---|---|
| $V$ / V | 1.42 | 1.34 | 1.26 | 1.18 |

(a) State what is meant by the *electromotive force* of a cell. [1]

(b) Use the data to determine the internal resistance $r$ of the cell. [3]`

export default function ExamPaperDevPage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · EXAM PAPER
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 8 }}>
        A question, set like the paper
      </h1>
      <p className="body-2" style={{ marginBottom: 28, color: 'var(--ec-text-secondary)' }}>
        Bold number in the margin, parts in their own column, marks ranged right, dotted lines,
        code in the footer.
      </p>

      <ExamPaperSheet
        paperCode="9709/12"
        session="s23"
        subjectName="Mathematics"
        paperName="Paper 1 Pure Mathematics 1"
        page={4}
        turnOver
        rubric={<ExamPaperRubric totalMarks={75} />}
      >
        <ExamPaperQuestion questionNumber="7" text={MULTI} answerLines={4} first />
        <ExamPaperQuestion questionNumber="8" text={DATA} answerLines={3} />
      </ExamPaperSheet>

      <div style={{ height: 40 }} />

      <ExamPaperSheet paperCode="9702/22" session="w24" subjectName="Physics" page={2}>
        <ExamPaperQuestion questionNumber="3(b)(i)" text={LEAF} totalMarks={4} answerLines={5} first />
      </ExamPaperSheet>

      <div style={{ height: 40 }} />

      <p className="ec-label-tech" style={{ marginBottom: 12 }}>
        IN A LESSON · PRACTICE SECTION
      </p>
      <div className="lesson-page">
        <PracticeSection lesson={PRACTICE_LESSON} big returnPath="/courses/9702/1-3-errors-and-uncertainties" />
      </div>

      <div style={{ height: 40 }} />

      <div style={{ maxWidth: 420 }}>
        <ExamPaperSheet compact paperCode="9701/42" session="m23">
          <ExamPaperQuestion
            questionNumber="2(a)"
            text="Explain why the first ionisation energy of aluminium is lower than that of magnesium."
            totalMarks={2}
            first
          />
        </ExamPaperSheet>
      </div>
    </main>
  )
}
