import Link from 'next/link'
import { ArrowRight, BookOpen, Crown, Sparkles } from 'lucide-react'
import { getCourseCatalog } from '@/lib/courses'

/** Homepage promo — free premium courses funnel. */
export function LandingCoursesPromo() {
  const catalog = getCourseCatalog()
  const top = catalog
    .filter((c) => c.publishedCount > 0)
    .sort((a, b) => b.publishedCount - a.publishedCount)
    .slice(0, 4)

  return (
    <section className="landing-section scroll-mt-20" aria-labelledby="courses-promo-heading">
      <div className="course-premium-hero relative mx-auto max-w-5xl">
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="course-premium-badge mb-4">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              New · 100% free
            </span>
            <h2
              id="courses-promo-heading"
              className="landing-h2 text-[var(--ec-text-primary)]"
            >
              Premium A-Level courses — every topic, free
            </h2>
            <p className="landing-lead mt-4">
              Syllabus-aligned lessons with worked examples, simpler explanations,
              and real Cambridge past-paper questions. No paywall — built for students
              searching free notes who want more than a PDF.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/courses" className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2">
                Browse free courses
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/courses/9702"
                className="ec-btn-secondary inline-flex min-h-[48px] items-center gap-2"
              >
                Start 9702 Physics
              </Link>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {(top.length ? top : catalog.slice(0, 4)).map((course) => (
              <li key={course.code}>
                <Link
                  href={course.path}
                  className="course-subject-card group flex items-center gap-3 p-4 no-underline"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)]">
                    <BookOpen className="h-5 w-5 text-[var(--ec-brand)]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--ec-text-primary)] group-hover:text-[var(--ec-brand)]">
                      {course.name}
                    </p>
                    <p className="text-xs text-[var(--ec-text-tertiary)]">
                      {course.code} · {course.publishedCount || course.lessonCount} lessons
                    </p>
                  </div>
                  {course.publishedCount > 10 ? (
                    <Sparkles className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
