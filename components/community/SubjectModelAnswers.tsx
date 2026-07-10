import Link from 'next/link'
import type { CSSProperties } from 'react'
import { listQuestions } from '@/lib/community/qa'

/**
 * Surfaces a subject's worked model answers on the Cambridge subject hub page,
 * linking straight to each thread. Renders nothing for subjects with no answers.
 * Server component.
 */
export async function SubjectModelAnswers({
  subjectCode,
  subjectLabel,
  accent = 'var(--ec-brand)',
}: {
  subjectCode: string
  subjectLabel: string
  accent?: string
}) {
  const questions = await listQuestions({ subjectCode, limit: 6 })
  if (!questions.length) return null

  return (
    <section
      className="community-notes"
      style={{ marginTop: 24, '--sc': accent } as CSSProperties}
      aria-labelledby="subj-model-answers-h"
    >
      <div className="community-head">
        <div>
          <h2 id="subj-model-answers-h" className="ms-h3">
            Worked model answers
          </h2>
          <p className="ms-body-2 community-sub">
            Full-marks answers to real {subjectLabel} past-paper questions, each with a
            mark-by-mark examiner breakdown.
          </p>
        </div>
        <Link href={`/community/s/${subjectCode}`} className="ec-btn-primary community-contribute">
          See all →
        </Link>
      </div>
      <ul className="community-note-list">
        {questions.map((q) => (
          <li key={q.id} className="community-note-row">
            <Link href={`/community/questions/${q.id}`} className="community-note-main">
              <span className="community-note-title">
                {q.title}{' '}
                {q.acceptedAnswerId ? <span className="community-solved">solved ✓</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
