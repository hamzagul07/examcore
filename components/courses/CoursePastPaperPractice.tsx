'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, FileCheck2, Target } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'
import type { PastPaperPracticeQuestion } from '@/lib/courses/types'

function badgeLabel(q: PastPaperPracticeQuestion, subjectCode: string): string {
  return `${subjectCode}/${q.paperVariant} ${q.session} ${q.year} Q${q.questionNumber}`
}

export function CoursePastPaperPractice({
  subjectCode,
  questions,
}: {
  subjectCode: string
  questions: PastPaperPracticeQuestion[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!questions.length) return null

  return (
    <VisualSectionFrame
      id="past-paper-practice"
      title="Past paper practice"
      hint="Real Cambridge questions for this paper and topic — try them, then check the mark scheme."
      icon={Target}
      accent="exam"
      className="course-past-paper-practice"
    >
      <div className="space-y-4">
        {questions.map((q) => {
          const open = openId === q.questionId
          return (
            <article
              key={q.questionId}
              className="course-past-paper-card p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--ec-text-tertiary)]">
                <span className="rounded-md bg-[var(--ec-surface-muted)] px-2 py-1 font-mono">
                  {badgeLabel(q, subjectCode)}
                </span>
                <span className="course-premium-badge text-[10px]">
                  <FileCheck2 className="h-3 w-3" aria-hidden />
                  {q.marks} marks
                </span>
              </div>
              <div className="mb-4 text-sm leading-relaxed text-[var(--ec-text-primary)]">
                <CourseRichText content={q.questionTextPreview} variant="prose" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={q.markHref}
                  className="ec-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold no-underline"
                >
                  Try this question
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  className="ec-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  onClick={() =>
                    setOpenId((prev) => (prev === q.questionId ? null : q.questionId))
                  }
                  aria-expanded={open}
                >
                  View mark scheme
                  <ChevronDown
                    className={`h-4 w-4 transition-transform${open ? ' rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              </div>
              {open ? (
                <div className="mt-4 rounded-xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-4">
                  {q.markPoints.length ? (
                    <ol className="space-y-2 text-sm text-[var(--ec-text-primary)]">
                      {q.markPoints.map((mp, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 font-mono text-xs text-[var(--ec-text-tertiary)]">
                            +{mp.marks}
                          </span>
                          <CourseRichText content={mp.text} variant="prose" />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-[var(--ec-text-secondary)]">
                      Mark scheme not yet linked for this question.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </VisualSectionFrame>
  )
}
