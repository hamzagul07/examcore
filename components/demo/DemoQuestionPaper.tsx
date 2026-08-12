import Link from 'next/link'

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
 * puts in front of them. So this sets the queue the way Cambridge sets it —
 * numbered questions, lettered parts, marks ranged right in brackets, a serif
 * face and a ruled margin — because the recognition is the point.
 *
 * The one thing it adds that a paper does not have is the crimson note under
 * each question saying why it is in *this* student's queue. That line is the
 * actual product: the paper is generic, the queue is not.
 */
export function DemoQuestionPaper() {
  const total = demoBankTotalMarks()

  return (
    <div className="demo-paper">
      <header className="demo-paper__head">
        <div className="demo-paper__brand">
          <p className="demo-paper__level mono">{DEMO_BANK_PAPER.level}</p>
          <p className="demo-paper__subject serif">{DEMO_BANK_PAPER.name}</p>
        </div>
        <div className="demo-paper__codes mono">
          <span className="demo-paper__code">{DEMO_BANK_PAPER.code}</span>
          <span>{DEMO_BANK_PAPER.session}</span>
          <span>{DEMO_BANK_PAPER.duration}</span>
        </div>
      </header>

      <p className="demo-paper__rubric">
        Answer <strong>all</strong> questions. The number of marks is given in
        brackets [ ] at the end of each question or part question.
        <span className="demo-paper__total mono">{total} marks</span>
      </p>

      <ol className="demo-paper__questions">
        {DEMO_BANK_QUESTIONS.map((q) => (
          <li key={q.id} className="demo-paper__q">
            <span className="demo-paper__n mono" aria-hidden>
              {q.number}
            </span>

            <div className="demo-paper__body">
              {q.parts.map((p, i) => (
                <div key={i} className="demo-paper__part">
                  {p.label && (
                    <span className="demo-paper__label mono">{p.label}</span>
                  )}
                  <p className="demo-paper__text serif">
                    {p.text}
                    <span className="demo-paper__marks mono">[{p.marks}]</span>
                  </p>
                </div>
              ))}

              <p className="demo-paper__why">
                <span className="demo-paper__why-stamp mono" aria-hidden>
                  {q.topicCode}
                </span>
                <span>
                  <strong>{q.topicLabel}</strong> — {q.reason}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="demo-paper__foot">
        <p className="demo-paper__foot-note">
          On a real account these are pulled from the past-paper bank for the
          topics you are weakest at, and each one opens straight into marking.
        </p>
        <Link href="/past-papers" className="ec-btn-ghost demo-paper__foot-cta">
          Browse the real past papers
        </Link>
      </footer>
    </div>
  )
}
