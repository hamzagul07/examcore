import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Crown, FlaskConical, List, Sparkles } from 'lucide-react'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllCourseLessonPaths,
  getCourseLesson,
  getCourseLessons,
  getCourseSubject,
  loadPaperScopedLesson,
} from '@/lib/courses'
import type { CourseLesson } from '@/lib/courses/types'
import { findPaperTrack } from '@/lib/courses/paper-tracks'
import { paperNumberFromDir } from '@/lib/courses/paths'
import { buildCourseLessonSeo } from '@/lib/courses/seo'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { CourseStudioShell } from '@/components/courses/CourseStudioShell'
import { MarkLessonCompleteButton } from '@/components/courses/CourseProgressClient'
import { CourseLearningObjectives } from '@/components/courses/CourseLearningObjectives'
import { CourseLessonExperience } from '@/components/courses/CourseLessonExperience'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { CourseRelatedTopics } from '@/components/courses/CourseRelatedTopics'
import { HeroVisualOverview } from '@/components/courses/visuals/HeroVisualOverview'
import { CourseLessonFaq } from '@/components/courses/CourseLessonFaq'
import { CourseLessonJsonLd } from '@/components/seo/CourseLessonJsonLd'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'

type Props = {
  params: Promise<{ code: string; slug: string[] }>
  searchParams: Promise<{ pilot?: string; paper?: string }>
}

const PAPER_PILOT_PARAMS = [
  { code: '9702', slug: ['paper-1', '2-1-equations-of-motion'] },
  { code: '9702', slug: ['paper-2', '7-1-progressive-waves'] },
  { code: '9702', slug: ['paper-3', '1-3-errors-and-uncertainties'] },
  { code: '9702', slug: ['paper-4', '25-3-hubbles-law-and-the-big-bang-theory'] },
  { code: '9702', slug: ['paper-5', '1-3-errors-and-uncertainties'] },
] as const

type ResolvedLesson =
  | {
      mode: 'flat'
      lessonSlug: string
      lesson: CourseLesson
      paperDir: null
      paperNumber: null
    }
  | {
      mode: 'paper'
      lessonSlug: string
      lesson: CourseLesson
      paperDir: string
      paperNumber: string
    }

function resolveLesson(
  code: string,
  slug: string[],
  pilot: boolean
): ResolvedLesson | null {
  if (slug.length === 1) {
    const lessonSlug = slug[0]
    const lesson = getCourseLesson(code, lessonSlug)
    if (!lesson) return null
    return { mode: 'flat', lessonSlug, lesson, paperDir: null, paperNumber: null }
  }

  if (slug.length === 2 && /^paper-\d+$/.test(slug[0])) {
    const paperDir = slug[0]
    const lessonSlug = slug[1]
    const paperNumber = paperNumberFromDir(paperDir)
    if (!paperNumber) return null

    const lesson = loadPaperScopedLesson(code, paperNumber, lessonSlug, { pilot })
    if (!lesson) return null

    return { mode: 'paper', lessonSlug, lesson, paperDir, paperNumber }
  }

  return null
}

function lessonPath(
  code: string,
  resolved: ResolvedLesson,
  targetSlug: string,
  isPilotPreview: boolean
): string {
  if (resolved.mode === 'paper' && resolved.paperDir) {
    return `/courses/${code}/${resolved.paperDir}/${targetSlug}${isPilotPreview ? '?pilot=1' : ''}`
  }
  return `/courses/${code}/${targetSlug}`
}

export async function generateStaticParams() {
  const flat = getAllCourseLessonPaths().map(({ code, slug }) => ({
    code,
    slug: [slug],
  }))
  return [...flat, ...PAPER_PILOT_PARAMS]
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { code, slug } = await params
  const { pilot } = await searchParams
  const isPilotPreview = pilot === '1'

  const resolved = resolveLesson(code, slug, isPilotPreview)
  if (!resolved) return {}

  const course = getCourseSubject(code)
  if (!course) return {}

  const { lesson } = resolved
  const seo = buildCourseLessonSeo(course, lesson)
  const path =
    resolved.mode === 'paper' && resolved.paperDir
      ? `/courses/${code}/${resolved.paperDir}/${resolved.lessonSlug}${isPilotPreview ? '?pilot=1' : ''}`
      : `/courses/${code}/${resolved.lessonSlug}`

  return createPageMetadata({
    title: isPilotPreview ? `[Pilot] ${seo.title}` : seo.title,
    description: seo.description,
    path,
    keywords: seo.keywords,
    modifiedTime: lesson.updated ? `${lesson.updated}T12:00:00.000Z` : undefined,
    index: !isPilotPreview,
  })
}

export default async function CourseLessonCatchAllPage({ params, searchParams }: Props) {
  const { code, slug } = await params
  const { pilot, paper } = await searchParams
  const isPilotPreview = pilot === '1'

  const resolved = resolveLesson(code, slug, isPilotPreview)
  if (!resolved) notFound()

  const course = getCourseSubject(code)
  if (!course) notFound()

  const { lesson, lessonSlug } = resolved
  const lessons = getCourseLessons(code)
  const activeTrack = findPaperTrack(code, lessons, paper)
  const paperLabel = activeTrack
    ? `${activeTrack.shortName} · ${activeTrack.subtitle}`
    : lesson.paperName
  const overviewHref = activeTrack
    ? `/courses/${code}?paper=${encodeURIComponent(activeTrack.number)}`
    : `/courses/${code}`
  const idx = lessons.findIndex((l) => l.slug === lessonSlug)
  const prev = idx > 0 ? lessons[idx - 1] : null
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null
  const pastPaperQuestions = await fetchPastPaperQuestionsForTopic(
    code,
    lesson.topicCode,
    2
  )

  const isFullLesson =
    lesson.status === 'published' || lesson.status === 'premium'
  const isPilotLesson = lesson.status === 'pilot' || isPilotPreview
  const enriched = enrichLessonVisual(code, lesson)
  const seo = buildCourseLessonSeo(course, lesson)

  return (
    <MarketingPageShell studio>
      <CourseLessonJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lesson={lesson}
        seoTitle={seo.title}
        seoDescription={seo.description}
      />

      <CourseStudioShell
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lessons={lessons}
        activeSlug={lessonSlug}
        breadcrumbs={seo.breadcrumbs}
        markHref={seo.markPath}
      >
        <div className="course-studio-mobile-nav">
          <Link href={overviewHref}>
            <List className="h-4 w-4" aria-hidden />
            {activeTrack ? activeTrack.shortName : `All ${course.code} topics`}
          </Link>
        </div>

        {isPilotLesson ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            <strong className="inline-flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4" aria-hidden />
              Pilot preview
            </strong>
            {' — '}
            {resolved.paperNumber ? `Paper ${resolved.paperNumber} ` : ''}
            generated lesson ({lesson.generatorVersion ?? 'b-v3'}). Not published; for
            internal review only.
          </div>
        ) : null}

        <header className="course-studio-hero">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="course-studio-label">
                {course.level} · {paperLabel}
              </span>
              {isPilotLesson ? (
                <span className="course-premium-badge">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                  Pilot lesson
                </span>
              ) : isFullLesson ? (
                <span className="course-premium-badge">
                  <Crown className="h-3.5 w-3.5" aria-hidden />
                  Premium lesson
                </span>
              ) : (
                <span className="course-premium-badge">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Syllabus outline
                </span>
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="course-topic-badge">Topic {lesson.topicCode}</span>
              <span className="course-subject-chip">
                {course.code} {course.name}
              </span>
            </div>
            <h1 className="course-studio-title">
              {lesson.title}
              <span className="course-title-code"> — {lesson.topicCode}</span>
            </h1>
            <p className="course-studio-lead">{lesson.summary}</p>
            <div className="course-studio-meta">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden />
                ~{lesson.durationMin} min
              </span>
              <span>{lesson.paperName}</span>
            </div>
          </div>
          <div className="course-studio-hero-diagram mt-5 lg:mt-0">
            <HeroVisualOverview template={enriched.template} />
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
          subjectCode={code}
        />

        <CourseLessonFaq items={seo.faqs} />

        <CourseRelatedTopics
          subjectCode={code}
          subjectName={course.name}
          lessons={lessons}
          currentSlug={lessonSlug}
          nextLesson={next}
        />

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[var(--course-border)] pt-8">
          <MarkLessonCompleteButton subjectCode={code} lessonSlug={lessonSlug} />
          <div className="flex flex-wrap gap-3 text-sm">
            {prev ? (
              <Link
                href={lessonPath(code, resolved, prev.slug, isPilotPreview)}
                className="text-[var(--course-accent)] no-underline hover:underline"
              >
                ← {prev.title}
              </Link>
            ) : null}
            {next ? (
              <Link
                href={lessonPath(code, resolved, next.slug, isPilotPreview)}
                className="ml-auto text-[var(--course-accent)] no-underline hover:underline"
              >
                {next.title} →
              </Link>
            ) : null}
          </div>
        </div>
      </CourseStudioShell>
    </MarketingPageShell>
  )
}
