import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

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
      className="course-seo-intro ec-card ec-card--paper mb-8 border-2 border-[color-mix(in_srgb,var(--ec-brand)_22%,var(--ec-border-subtle))] p-5 sm:p-6"
      aria-labelledby="lesson-seo-intro"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2
          id="lesson-seo-intro"
          className="text-lg font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-xl"
        >
          {heading}
        </h2>
        <span className="ec-ink-stamp shrink-0" aria-hidden>
          {subjectCode}
        </span>
      </div>
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
          className="inline-flex items-center gap-1.5 rounded border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-paper)] px-3 py-2 font-semibold text-[var(--ec-text-primary)] no-underline hover:border-[var(--ec-brand)]/40"
        >
          <span className="ec-ink-stamp" aria-hidden>
            ¶
          </span>
          {courseLabel}
        </Link>
        <Link
          href={markPath}
          className="inline-flex items-center gap-1.5 rounded border-2 border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border-subtle))] bg-[color-mix(in_srgb,var(--ec-brand)_10%,var(--ec-paper))] px-3 py-2 font-semibold text-[var(--ec-brand)] no-underline hover:border-[var(--ec-brand)]"
        >
          <span className="ec-ink-stamp" aria-hidden>
            M1
          </span>
          {markCtaLabel} →
        </Link>
        <Link
          href={hubLink}
          className="inline-flex items-center gap-1.5 rounded border-2 border-[var(--ec-border-subtle)] px-3 py-2 font-medium text-[var(--ec-text-secondary)] no-underline hover:text-[var(--ec-accent)]"
        >
          {hubLabel}
        </Link>
      </div>
    </section>
  )
}
