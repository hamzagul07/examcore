import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowRight, BookOpen, Target } from 'lucide-react'

export function CourseLessonSeoIntro({
  heading,
  paragraph,
  subjectCode,
  subjectName,
  markPath,
  courseHref,
  subjectHubHref,
  markCtaLabel = 'Mark a past paper',
  courseCtaLabel,
  subjectHubCtaLabel,
}: {
  heading: string
  paragraph: string
  subjectCode: string
  subjectName: string
  markPath: string
  courseHref?: string
  subjectHubHref?: string
  markCtaLabel?: string
  courseCtaLabel?: string
  subjectHubCtaLabel?: string
}) {
  const courseLink = courseHref ?? `/courses/${subjectCode}`
  const hubLink = subjectHubHref ?? `/subjects/${subjectCode}`
  const courseLabel = courseCtaLabel ?? `Full ${subjectName} ${subjectCode} course`
  const hubLabel = subjectHubCtaLabel ?? `${subjectCode} subject hub`
  return (
    <section
      className="course-seo-intro mb-8 rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_22%,var(--ec-border-subtle))] bg-[var(--ec-surface-muted)] p-5 sm:p-6"
      aria-labelledby="lesson-seo-intro"
    >
      <h1
        id="lesson-seo-intro"
        className="mb-3 text-lg font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-xl"
      >
        {heading}
      </h1>
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
          href={courseLink}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2 font-semibold text-[var(--ec-text-primary)] no-underline hover:border-[var(--ec-brand)]/40"
        >
          <BookOpen className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
          {courseLabel}
        </Link>
        <Link
          href={markPath}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border-subtle))] bg-[color-mix(in_srgb,var(--ec-brand)_10%,var(--ec-surface-raised))] px-3 py-2 font-semibold text-[var(--ec-brand)] no-underline hover:border-[var(--ec-brand)]"
        >
          <Target className="h-4 w-4" aria-hidden />
          {markCtaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href={hubLink}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--ec-border-subtle)] px-3 py-2 font-medium text-[var(--ec-text-secondary)] no-underline hover:text-[var(--ec-accent)]"
        >
          {hubLabel}
        </Link>
      </div>
    </section>
  )
}
