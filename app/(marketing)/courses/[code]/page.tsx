import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getCourseLessons,
  getCourseSubject,
  getCourseSubjectCodes,
} from '@/lib/courses'
import {
  filterLessonsByPaper,
  findPaperTrack,
  getPaperTracks,
  subjectHasPaperChoice,
} from '@/lib/courses/paper-tracks'
import { buildCourseSubjectSeo } from '@/lib/courses/seo'
import { CoursePaperPicker } from '@/components/courses/CoursePaperPicker'
import { CourseStudioShell } from '@/components/courses/CourseStudioShell'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { CourseSubjectJsonLd } from '@/components/seo/CourseSubjectJsonLd'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ paper?: string }>
}

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

export default async function CourseSubjectPage({ params, searchParams }: Props) {
  const { code } = await params
  const { paper } = await searchParams
  const course = getCourseSubject(code)
  if (!course) notFound()

  const lessons = getCourseLessons(code)
  const tracks = getPaperTracks(code, lessons)
  const hasPaperChoice = subjectHasPaperChoice(code, lessons)
  const activeTrack = findPaperTrack(code, lessons, paper) ?? tracks[0] ?? null
  const scopedLessons = hasPaperChoice
    ? filterLessonsByPaper(lessons, activeTrack)
    : lessons
  const firstPublished =
    scopedLessons.find((l) => l.status === 'published' || l.status === 'premium') ??
    scopedLessons[0]
  const seo = buildCourseSubjectSeo(course, course.lessonCount)

  const startHref = firstPublished
    ? activeTrack
      ? `/courses/${code}/${firstPublished.slug}?paper=${encodeURIComponent(activeTrack.number)}`
      : `/courses/${code}/${firstPublished.slug}`
    : null

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
              {hasPaperChoice && activeTrack ? (
                <>
                  <strong className="text-[var(--ec-text-primary)]">{activeTrack.shortName}</strong>
                  {' · '}
                  {activeTrack.subtitle}
                  {' — '}
                  {scopedLessons.length} topic{scopedLessons.length === 1 ? '' : 's'}
                  {activeTrack.premiumCount > 0
                    ? ` · ${activeTrack.premiumCount} premium lessons`
                    : ''}
                  . Learn visually, then mark real past papers on every topic.
                </>
              ) : (
                <>
                  {course.lessonCount} official syllabus topics · {course.publishedCount} premium
                  lessons live. Learn visually, read concise notes, then mark real past papers on
                  every topic.
                </>
              )}
            </p>
            {startHref && firstPublished ? (
              <Link
                href={startHref}
                className="ec-btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold no-underline"
              >
                {firstPublished.status === 'published' || firstPublished.status === 'premium'
                  ? activeTrack
                    ? `Start ${activeTrack.shortName}`
                    : 'Start with a premium lesson'
                  : 'Browse topics'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </header>

        {hasPaperChoice ? (
          <Suspense fallback={null}>
            <CoursePaperPicker
              subjectCode={code}
              tracks={tracks}
              selectedNumber={activeTrack?.number ?? null}
            />
          </Suspense>
        ) : null}

        <section className="space-y-6">
          <h2 className="course-studio-section-title">How this course works</h2>
          <ol className="course-studio-prose list-decimal space-y-3 pl-5">
            <li>
              {hasPaperChoice
                ? 'Choose your exam paper, then pick a topic from the left.'
                : 'Pick a topic from the left — grouped by exam paper.'}
            </li>
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
