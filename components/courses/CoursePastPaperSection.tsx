import Link from 'next/link'
import { ArrowRight, FileCheck2 } from 'lucide-react'
import type { PastPaperQuestionRef } from '@/lib/courses/types'

export function CoursePastPaperSection({
  questions,
  topicTitle,
}: {
  questions: PastPaperQuestionRef[]
  topicTitle: string
}) {
  if (!questions.length) {
    return (
      <section className="mt-12" aria-labelledby="past-paper-heading">
        <h2 id="past-paper-heading" className="mb-3 text-xl font-semibold text-[var(--ec-text-primary)]">
          Practise with past papers
        </h2>
        <p className="text-sm text-[var(--ec-text-secondary)]">
          Upload any {topicTitle} question from your past-paper book on{' '}
          <Link href="/mark" className="text-[var(--ec-accent)] hover:underline">
            MarkScheme
          </Link>{' '}
          — we mark against the official scheme.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-12" aria-labelledby="past-paper-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="past-paper-heading" className="text-xl font-semibold text-[var(--ec-text-primary)]">
            Real Cambridge past-paper questions
          </h2>
          <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
            These questions are from official past papers in our library — not made-up revision questions.
          </p>
        </div>
        <span className="course-premium-badge">
          <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
          Verified past paper
        </span>
      </div>

      <div className="space-y-4">
        {questions.map((q) => (
          <article key={`${q.paperCode}-${q.questionNumber}-${q.paperSession}`} className="course-past-paper-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--ec-text-tertiary)]">
              <span className="rounded-md bg-[var(--ec-surface-muted)] px-2 py-1 font-mono">
                {q.paperCode}
              </span>
              <span>{q.sessionLabel}</span>
              <span>·</span>
              <span>
                Question {q.questionNumber} · {q.totalMarks} marks
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-[var(--ec-text-primary)]">
              {q.questionText}
            </p>
            <Link
              href={q.markHref}
              className="ec-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
            >
              Mark this past-paper answer
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
