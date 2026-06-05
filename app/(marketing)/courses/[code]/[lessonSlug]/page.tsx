import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Crown, Sparkles } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'
import {
  getAllCourseLessonPaths,
  getCourseLesson,
  getCourseLessons,
  getCourseSubject,
} from '@/lib/courses'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { CourseLessonContent } from '@/components/courses/CourseLessonContent'
import { CourseSidebar } from '@/components/courses/CourseSidebar'
import { MarkLessonCompleteButton } from '@/components/courses/CourseProgressClient'
import { CourseLearningObjectives } from '@/components/courses/CourseLearningObjectives'
import { CourseSimpleExplain } from '@/components/courses/CourseSimpleExplain'
import { CoursePastPaperSection } from '@/components/courses/CoursePastPaperSection'
import { CourseLessonFaq } from '@/components/courses/CourseLessonFaq'
import { CourseLessonJsonLd } from '@/components/seo/CourseLessonJsonLd'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'

type Props = { params: Promise<{ code: string; lessonSlug: string }> }

export async function generateStaticParams() {
  return getAllCourseLessonPaths().map(({ code, slug }) => ({
    code,
    lessonSlug: slug,
  }))
}

export async function generateMetadata({ params }: Props) {
  const { code, lessonSlug } = await params
  const course = getCourseSubject(code)
  const lesson = getCourseLesson(code, lessonSlug)
  if (!course || !lesson) return {}

  const title = formatSerpTitle(
    `Free ${course.name} course: ${lesson.title} (${lesson.topicCode})`,
    true
  )
  const description = formatMetaDescription(lesson.summary)
  return createPageMetadata({
    title,
    description,
    path: `/courses/${code}/${lessonSlug}`,
    keywords: [
      `free ${code} ${lesson.title} notes`,
      `${course.name} ${lesson.title} revision`,
      `Cambridge ${lesson.topicCode} lesson`,
      `${course.level} ${course.name} course free`,
      `ZNotes alternative ${course.name}`,
    ],
  })
}

export default async function CourseLessonPage({ params }: Props) {
  const { code, lessonSlug } = await params
  const course = getCourseSubject(code)
  const lesson = getCourseLesson(code, lessonSlug)
  if (!course || !lesson) notFound()

  const lessons = getCourseLessons(code)
  const idx = lessons.findIndex((l) => l.slug === lessonSlug)
  const prev = idx > 0 ? lessons[idx - 1] : null
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null
  const pastPaperQuestions = await fetchPastPaperQuestionsForTopic(
    code,
    lesson.topicCode,
    2
  )

  const isFullLesson = lesson.status === 'published' || lesson.status === 'premium'

  return (
    <MarketingPageShell narrow>
      <CourseLessonJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lesson={lesson}
      />

      <article className="py-12 sm:py-16">
        <Link
          href={`/courses/${code}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--ec-text-tertiary)] no-underline hover:text-[var(--ec-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to {course.name} course
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <header className="course-premium-hero relative mb-8">
              <div className="relative">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="course-premium-badge">
                    <Crown className="h-3.5 w-3.5" aria-hidden />
                    Free premium course
                  </span>
                  {isFullLesson ? (
                    <span className="course-premium-badge">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      Full lesson
                    </span>
                  ) : null}
                </div>
                <p className="ec-label-tech mb-3">
                  {course.level} {course.code} · {lesson.paperName}
                </p>
                <h1 className="text-display mb-3 text-[var(--ec-text-primary)]">
                  {lesson.title}
                </h1>
                <p className="max-w-2xl text-[var(--ec-text-secondary)]">{lesson.summary}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--ec-text-tertiary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    ~{lesson.durationMin} min
                  </span>
                  <span>Syllabus {lesson.topicCode}</span>
                </div>
              </div>
            </header>

            {lesson.learningObjectives?.length ? (
              <div className="mb-8">
                <CourseLearningObjectives items={lesson.learningObjectives} />
              </div>
            ) : null}

            {lesson.diagram ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lesson.diagram.src}
                alt={lesson.diagram.alt}
                className="mb-8 w-full rounded-2xl border border-[var(--ec-border-subtle)]"
              />
            ) : null}

            <CourseLessonContent lesson={lesson} />

            {lesson.simpleExplanation ? (
              <div className="mt-8">
                <CourseSimpleExplain data={lesson.simpleExplanation} />
              </div>
            ) : null}

            <CoursePastPaperSection
              questions={pastPaperQuestions}
              topicTitle={lesson.title}
            />

            {lesson.faq?.length ? <CourseLessonFaq items={lesson.faq} /> : null}

            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[var(--ec-border-subtle)] pt-8">
              <MarkLessonCompleteButton subjectCode={code} lessonSlug={lessonSlug} />
              <div className="flex flex-wrap gap-3 text-sm">
                {prev ? (
                  <Link
                    href={`/courses/${code}/${prev.slug}`}
                    className="text-[var(--ec-accent)] no-underline hover:underline"
                  >
                    ← {prev.title}
                  </Link>
                ) : null}
                {next ? (
                  <Link
                    href={`/courses/${code}/${next.slug}`}
                    className="ml-auto text-[var(--ec-accent)] no-underline hover:underline"
                  >
                    {next.title} →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <CourseSidebar subjectCode={code} lessons={lessons} activeSlug={lessonSlug} />
        </div>
      </article>
    </MarketingPageShell>
  )
}
