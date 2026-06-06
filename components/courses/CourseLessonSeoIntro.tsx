import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowRight, BookOpen, Target } from 'lucide-react'

export function CourseLessonSeoIntro({
  heading,
  paragraph,
  subjectCode,
  subjectName,
  markPath,
}: {
  heading: string
  paragraph: string
  subjectCode: string
  subjectName: string
  markPath: string
}) {
  return (
    <section
      className="course-seo-intro mb-8 rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_22%,var(--ec-border-subtle))] bg-[var(--ec-surface-muted)] p-5 sm:p-6"
      aria-labelledby="lesson-seo-intro"
    >
      <h2
        id="lesson-seo-intro"
        className="mb-3 text-lg font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-xl"
      >
        {heading}
      </h2>
      <div className="mb-4 text-sm leading-relaxed text-[var(--ec-text-secondary)] sm:text-base">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[var(--ec-text-primary)]">{children}</strong>
            ),
          }}
        >
          {paragraph}
        </ReactMarkdown>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={`/courses/${subjectCode}`}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2 font-semibold text-[var(--ec-text-primary)] no-underline hover:border-[var(--ec-brand)]/40"
        >
          <BookOpen className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
          Full {subjectName} {subjectCode} course
        </Link>
        <Link
          href={markPath}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border-subtle))] bg-[color-mix(in_srgb,var(--ec-brand)_10%,var(--ec-surface-raised))] px-3 py-2 font-semibold text-[var(--ec-brand)] no-underline hover:border-[var(--ec-brand)]"
        >
          <Target className="h-4 w-4" aria-hidden />
          Mark a past paper
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href={`/subjects/${subjectCode}`}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--ec-border-subtle)] px-3 py-2 font-medium text-[var(--ec-text-secondary)] no-underline hover:text-[var(--ec-accent)]"
        >
          {subjectCode} subject hub
        </Link>
      </div>
    </section>
  )
}
