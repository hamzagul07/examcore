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
import { CourseStudioShell } from '@/components/courses/CourseStudioShell'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
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
    <MarketingPageShell studio>
      <CourseSubjectJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        description={seo.description}
        lessons={lessons}
      />

      <CourseStudioShell
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lessons={lessons}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Courses', path: '/courses' },
          { name: course.name, path: `/courses/${code}` },
        ]}
        markHref={`/mark?subject=${code}`}
      >
        <header className="course-studio-hero mb-8">
          <div>
            <p className="course-studio-label mb-2">
              {course.level} · {code} · Free premium course
            </p>
            <h1 className="course-studio-title">{course.name}</h1>
            <p className="course-studio-lead">
              {course.lessonCount} official syllabus topics · {course.publishedCount} premium
              lessons live. Learn visually, read concise notes, then mark real past papers on
              every topic.
            </p>
            {firstPublished ? (
              <Link
                href={`/courses/${code}/${firstPublished.slug}`}
                className="ec-btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold no-underline"
              >
                {firstPublished.status === 'published' ||
                firstPublished.status === 'premium'
                  ? 'Start with a premium lesson'
                  : 'Browse topics'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </header>

        <section className="space-y-6">
          <h2 className="course-studio-section-title">How this course works</h2>
          <ol className="course-studio-prose list-decimal space-y-3 pl-5">
            <li>Pick a topic from the left — grouped by exam paper.</li>
            <li>Learn visually with diagrams and step cards, or read full notes.</li>
            <li>
              Attempt a past-paper question and mark on{' '}
              <Link href="/mark" className="text-[var(--course-accent)]">
                MarkScheme
              </Link>
              .
            </li>
            <li>Mark the topic complete and move to the next.</li>
          </ol>

          <div className="rounded-xl border border-[var(--course-border)] bg-[var(--course-surface-card)] p-5">
            <p className="course-studio-prose m-0 text-[0.95rem]">
              <strong className="text-[var(--ec-text-primary)]">Premium lessons</strong> include
              worked examples, formulas, and examiner tips. Outline topics still show syllabus
              alignment — you can practise marking immediately.
            </p>
          </div>
        </section>
      </CourseStudioShell>
    </MarketingPageShell>
  )
}
