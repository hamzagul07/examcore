import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Crown, Sparkles } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllCourseLessonPaths,
  getCourseLesson,
  getCourseLessons,
  getCourseSubject,
} from '@/lib/courses'
import { buildCourseLessonSeo } from '@/lib/courses/seo'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { CourseBreadcrumbs } from '@/components/courses/CourseBreadcrumbs'
import { CourseSidebar } from '@/components/courses/CourseSidebar'
import { MarkLessonCompleteButton } from '@/components/courses/CourseProgressClient'
import { CourseLearningObjectives } from '@/components/courses/CourseLearningObjectives'
import { CourseLessonExperience } from '@/components/courses/CourseLessonExperience'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { CourseRelatedTopics } from '@/components/courses/CourseRelatedTopics'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
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

  const seo = buildCourseLessonSeo(course, lesson)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/courses/${code}/${lessonSlug}`,
    keywords: seo.keywords,
    modifiedTime: lesson.updated ? `${lesson.updated}T12:00:00.000Z` : undefined,
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
  const enriched = enrichLessonVisual(code, lesson)
  const seo = buildCourseLessonSeo(course, lesson)

  return (
    <MarketingPageShell wide>
      <CourseLessonJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lesson={lesson}
        seoTitle={seo.title}
        seoDescription={seo.description}
      />

      <article className="py-12 sm:py-16">
        <CourseBreadcrumbs items={seo.breadcrumbs} />
        <Link
          href={`/courses/${code}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--ec-text-tertiary)] no-underline hover:text-[var(--ec-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to {course.name} course
        </Link>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-12">
          <div className="min-w-0">
            <header className="course-premium-hero relative mb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-center lg:gap-8">
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
              <div className="course-premium-hero-diagram-wrap mt-6 hidden lg:mt-0 lg:block">
                <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--ec-brand)]">
                  Topic at a glance
                </p>
                <TopicDiagram template={enriched.template} className="max-h-[180px]" />
              </div>
            </header>

            <CourseLessonSeoIntro
              heading={seo.introHeading}
              paragraph={seo.introParagraph}
              subjectCode={code}
              subjectName={course.name}
              markPath={seo.markPath}
            />

            {lesson.learningObjectives?.length ? (
              <div className="mb-8">
                <CourseLearningObjectives items={lesson.learningObjectives} />
              </div>
            ) : null}

            <CourseLessonExperience
              lesson={lesson}
              enriched={enriched}
              pastPaperQuestions={pastPaperQuestions}
              topicTitle={lesson.title}
            />

            <CourseLessonFaq items={seo.faqs} />

            <CourseRelatedTopics
              subjectCode={code}
              subjectName={course.name}
              lessons={lessons}
              currentSlug={lessonSlug}
            />

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
