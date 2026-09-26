import Link from 'next/link'

import {
  ExamPaperQuestion,
  ExamPaperRubric,
  ExamPaperSheet,
} from '@/components/exam-paper/ExamPaper'
import {
  DEMO_BANK_PAPER,
  DEMO_BANK_QUESTIONS,
  demoBankTotalMarks,
} from '@/lib/demo/question-bank'

/**
 * The question desk, set as a paper.
 *
 * A list of question titles is what most banks look like and it is the wrong
 * form here: a student decides whether a question is worth sitting by reading
 * the stem and seeing the mark allocation, which is exactly what a real paper
 * puts in front of them. So this is the shared exam-paper renderer — the same
 * sheet the marking desk and the lessons print — because the recognition is
 * the point, and because /demo should show the paper a student will actually
 * meet rather than a lookalike of it.
 *
 * The one thing it adds that a paper does not have is the crimson note under
 * each question saying why it is in *this* student's queue. That line is the
 * actual product: the paper is generic, the queue is not.
 */
export function DemoQuestionPaper() {
  return (
    <div className="demo-paper">
      <ExamPaperSheet
        paperCode={DEMO_BANK_PAPER.code}
        session={DEMO_BANK_PAPER.session}
        subjectName={DEMO_BANK_PAPER.name}
        paperName={`${DEMO_BANK_PAPER.level} · ${DEMO_BANK_PAPER.duration}`}
        rubric={<ExamPaperRubric totalMarks={demoBankTotalMarks()} />}
        foot={
          <footer className="demo-paper__foot">
            <p className="demo-paper__foot-note">
              On a real account these are pulled from the past-paper bank for the
              topics you are weakest at, and each one opens straight into marking.
            </p>
            <Link href="/past-papers" className="ec-btn-ghost demo-paper__foot-cta">
              Browse the real past papers
            </Link>
          </footer>
        }
      >
        {DEMO_BANK_QUESTIONS.map((q, i) => (
          <ExamPaperQuestion
            key={q.id}
            questionNumber={String(q.number)}
            parts={q.parts.map((p) => ({ label: p.label, text: p.text, marks: p.marks }))}
            first={i === 0}
            after={
              <p className="demo-paper__why">
                <span className="demo-paper__why-stamp mono" aria-hidden>
                  {q.topicCode}
                </span>
                <span>
                  <strong>{q.topicLabel}</strong> — {q.reason}
                </span>
              </p>
            }
          />
        ))}
      </ExamPaperSheet>
    </div>
  )
}
