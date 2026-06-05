import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCourseCatalog } from '@/lib/courses'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const metadata = createPageMetadata({
  title: 'Free Cambridge A-Level & O-Level courses — topic by topic',
  description:
    'Free syllabus-aligned courses for Cambridge A-Level and O-Level. Learn every topic step by step, then practise past papers with real mark scheme marking on MarkScheme.',
  path: '/courses',
  keywords: [
    'free A Level course',
    'free Cambridge notes',
    'ZNotes alternative',
    'A Level revision free',
    'Cambridge syllabus topics',
    '9709 course free',
  ],
})

export default function CoursesIndexPage() {
  const catalog = getCourseCatalog()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/courses"
        title="Free Cambridge courses"
        description="Syllabus-aligned free courses for Cambridge International A-Level and O-Level subjects."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Free courses', path: '/courses' },
        ]}
      />

      <MarketingHero
        label="100% free"
        title={
          <span className="gradient-text">
            Cambridge courses — every topic, step by step
          </span>
        }
        lead="Premium-quality, syllabus-aligned lessons for every Cambridge topic — 100% free. Each lesson includes simpler explanations, real past-paper questions, and one-click marking. Built for students searching free A-Level notes who want more than a PDF dump."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/mark" className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold no-underline">
            Mark a past paper
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/blog/best-cambridge-past-paper-revision-resources-2026"
            className="ec-btn-secondary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold no-underline"
          >
            Compare revision resources
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: 'Topic by topic',
                body: 'Every lesson maps to an official Cambridge syllabus code — not random YouTube order.',
              },
              {
                icon: GraduationCap,
                title: 'Learn then practise',
                body: 'Each topic links to past-paper marking so notes turn into marks.',
              },
              {
                icon: Sparkles,
                title: 'Premium feel, zero cost',
                body: 'Worked examples, “explain simpler” mode, and verified past-paper questions — usually paywalled elsewhere.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-5"
              >
                <Icon className="mb-3 h-6 w-6 text-[var(--ec-accent)]" aria-hidden />
                <h2 className="mb-2 font-semibold text-[var(--ec-text-primary)]">{title}</h2>
                <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{body}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-6 text-2xl font-semibold text-[var(--ec-text-primary)]">
            Choose your subject
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {catalog.map((course) => (
              <Link
                key={course.code}
                href={course.path}
                className="course-subject-card group p-6 no-underline"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="ec-label-tech">{course.level}</span>
                  <span className="font-mono text-sm text-[var(--ec-text-tertiary)]">
                    {course.code}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-[var(--ec-text-primary)] group-hover:text-[var(--ec-accent)]">
                  {course.name}
                </h3>
                <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
                  {course.lessonCount} topics
                  {course.publishedCount > 0
                    ? ` · ${course.publishedCount} full lessons live`
                    : ' · syllabus outlines ready'}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ec-accent)]">
                  Start course
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-[var(--ec-text-tertiary)]">
            More subjects added as lessons are published. Content is original and syllabus-based — not copied from third-party note sites.
          </p>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
