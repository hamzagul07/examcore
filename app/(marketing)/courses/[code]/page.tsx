import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getCourseLessons,
  getCourseSubject,
  getCourseSubjectCodes,
} from '@/lib/courses'
import { buildCourseSubjectSeo } from '@/lib/courses/seo'
import { CourseSidebar } from '@/components/courses/CourseSidebar'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { CourseSubjectJsonLd } from '@/components/seo/CourseSubjectJsonLd'

type Props = { params: Promise<{ code: string }> }

export async function generateStaticParams() {
  return getCourseSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  const course = getCourseSubject(code)
  if (!course) return {}
  const seo = buildCourseSubjectSeo(course, course.lessonCount)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: course.path,
    keywords: seo.keywords,
  })
}

export default async function CourseSubjectPage({ params }: Props) {
  const { code } = await params
  const course = getCourseSubject(code)
  if (!course) notFound()

  const lessons = getCourseLessons(code)
  const firstPublished = lessons.find((l) => l.status === 'published') ?? lessons[0]
  const seo = buildCourseSubjectSeo(course, course.lessonCount)

  return (
    <MarketingPageShell>
      <CourseSubjectJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        description={seo.description}
        lessons={lessons}
      />

      <MarketingHero
        label={`${course.level} · ${code} · Free premium course`}
        title={
          <span className="gradient-text">
            {course.name} — complete free course
          </span>
        }
        lead={`${course.lessonCount} official syllabus topics · ${course.publishedCount} premium lessons live. Simpler explanations, real past-paper questions, and mark-scheme marking on every topic.`}
      >
        {firstPublished ? (
          <Link
            href={`/courses/${code}/${firstPublished.slug}`}
            className="ec-btn-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold no-underline"
          >
            {firstPublished.status === 'published' ||
            firstPublished.status === 'premium'
              ? 'Start with a premium lesson'
              : 'Browse topics'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </MarketingHero>

      <MarketingSection>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <h2 className="mb-4 text-xl font-semibold text-[var(--ec-text-primary)]">
              Free Cambridge {course.code} topics — how this course works
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              Every topic below is a separate page optimised for searches like &ldquo;{code}{' '}
              {course.name.toLowerCase()} revision&rdquo; and &ldquo;free {code} notes&rdquo;. Pick
              your syllabus point, learn visually, then mark a past paper.
            </p>
            <ol className="mb-8 list-decimal space-y-3 pl-5 text-[var(--ec-text-secondary)]">
              <li>Pick a topic from the syllabus list — grouped by exam paper.</li>
              <li>Read the lesson (full notes where published, outline + tips everywhere else).</li>
              <li>Attempt a past-paper question and mark on <Link href="/mark">MarkScheme</Link>.</li>
              <li>Mark the topic complete and move to the next.</li>
            </ol>

            <div className="rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-5">
              <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                <strong className="text-[var(--ec-text-primary)]">Full lessons</strong> include worked
                examples and exam tips. Other topics show syllabus-aligned outlines while we publish
                more — you can still practise marking immediately.
              </p>
            </div>
          </div>

          <CourseSidebar subjectCode={code} lessons={lessons} />
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
