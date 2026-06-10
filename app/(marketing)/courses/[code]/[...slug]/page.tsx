import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FlaskConical, List } from 'lucide-react'
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
import { getPaperPilotStaticParams } from '@/lib/courses/paper-pilot-routes'
import { paperNumberFromDir } from '@/lib/courses/paths'
import { buildCourseLessonSeo } from '@/lib/courses/seo'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { lessonHasInteractiveEmbed } from '@/lib/courses/interactive-embeds'
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
  preferPublished: boolean
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

    const lesson = loadPaperScopedLesson(code, paperNumber, lessonSlug, {
      preferPublished,
    })
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
  return [...flat, ...getPaperPilotStaticParams()]
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { code, slug } = await params
  const { pilot } = await searchParams
  const preferPublished = pilot === '0'
  const isPilotPreview = pilot === '1'

  const resolved = resolveLesson(code, slug, preferPublished)
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
    index: !isPilotPreview && lesson.status !== 'pilot',
  })
}

export default async function CourseLessonCatchAllPage({ params, searchParams }: Props) {
  const { code, slug } = await params
  const { pilot, paper } = await searchParams
  const preferPublished = pilot === '0'
  const isPilotPreview = pilot === '1'

  const resolved = resolveLesson(code, slug, preferPublished)
  if (!resolved) notFound()

  const course = getCourseSubject(code)
  if (!course) notFound()

  const { lesson, lessonSlug } = resolved
  const lessons = getCourseLessons(code)
  const activeTrack = findPaperTrack(code, lessons, paper)
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

  const isPilotLesson = lesson.status === 'pilot' || isPilotPreview
  const enriched = enrichLessonVisual(code, lesson)
  const hasInteractive = lessonHasInteractiveEmbed(lesson)
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

        <header className="course-studio-hero mb-6">
          <div>
            <p className="ms-overline" style={{ marginBottom: 8 }}>
              {course.code} · {lesson.topicCode}
              {lesson.paperName ? ` · ${lesson.paperName}` : ''}
            </p>
            <h1 className="ms-h2">{lesson.title}</h1>
            <p className="course-studio-lead mt-3">{lesson.summary}</p>
          </div>
          <div className="course-studio-hero-diagram mt-5 lg:mt-0">
            {hasInteractive ? (
              <p className="course-studio-hero-embed-badge ms-micro rounded-xl border border-[color-mix(in_srgb,var(--ec-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--ec-brand)_6%,transparent)] px-4 py-3">
                Includes a live PhET / GeoGebra simulation — scroll to Explore the concept.
              </p>
            ) : (
              <HeroVisualOverview template={enriched.template} />
            )}
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
