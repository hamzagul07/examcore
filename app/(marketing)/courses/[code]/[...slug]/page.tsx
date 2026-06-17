import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllCourseLessonPaths,
  getCourseLesson,
  getCourseLessons,
  getCourseSubject,
  loadPaperScopedLesson,
} from '@/lib/courses'
import type { CourseLesson } from '@/lib/courses/types'
import { getPaperPilotStaticParams } from '@/lib/courses/paper-pilot-routes'
import { paperNumberFromDir } from '@/lib/courses/paths'
import { buildCourseLessonSeo } from '@/lib/courses/seo'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { CourseLessonJsonLd } from '@/components/seo/CourseLessonJsonLd'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { CourseLessonClient } from '@/components/courses/margin-notes/CourseLessonClient'
import { buildSubjectCourseSeo } from '@/lib/seo/subject-seo'

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

  const { lesson, lessonSlug } = resolved
  const seo = buildCourseLessonSeo(course, lesson)
  const canonicalPath = `/courses/${code}/${lessonSlug}`
  const path =
    resolved.mode === 'paper' && resolved.paperDir
      ? `/courses/${code}/${resolved.paperDir}/${lessonSlug}${isPilotPreview ? '?pilot=1' : ''}`
      : canonicalPath
  const subjectSeo = buildSubjectCourseSeo(course, course.lessonCount)
  const isPublished = lesson.status === 'premium' || lesson.status === 'published'
  const modified = lesson.updated ? `${lesson.updated}T12:00:00.000Z` : undefined

  return createPageMetadata({
    title: isPilotPreview ? `[Pilot] ${seo.title}` : seo.title,
    description: seo.description,
    path,
    canonicalPath: isPilotPreview ? path : canonicalPath,
    keywords: seo.keywords,
    ogImagePath: subjectSeo.ogImagePath,
    ogType: isPublished ? 'article' : 'website',
    publishedTime: modified,
    modifiedTime: modified,
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
  const pastPaperQuestions = await fetchPastPaperQuestionsForTopic(code, lesson.topicCode, 2)
  const enriched = enrichLessonVisual(code, lesson)
  const seo = buildCourseLessonSeo(course, lesson)
  const subjectSeo = buildSubjectCourseSeo(course, course.lessonCount)
  const isPilotLesson = lesson.status === 'pilot' || isPilotPreview
  const paperQuery = paper ?? resolved.paperNumber ?? null

  return (
    <>
      <CourseLessonJsonLd
        subjectCode={code}
        subjectName={course.name}
        level={course.level}
        lesson={lesson}
        seoTitle={seo.title}
        seoDescription={seo.description}
        topics={subjectSeo.topics}
      />

      {isPilotLesson ? (
        <div className="pg pilot-banner-wrap">
          <div className="outline-banner card">
            <span className="outline-tag mono">PILOT PREVIEW</span>
            <p className="body-2">
              {resolved.paperNumber ? `Paper ${resolved.paperNumber} ` : ''}
              generated lesson ({lesson.generatorVersion ?? 'b-v3'}). For internal review — not
              published yet.
            </p>
          </div>
        </div>
      ) : null}

      {!isPilotLesson ? (
        <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-4 sm:px-6">
          <CourseLessonSeoIntro
            heading={seo.introHeading}
            paragraph={seo.introParagraph}
            subjectCode={code}
            subjectName={course.name}
            markPath={seo.markPath}
          />
        </div>
      ) : null}

      <CourseLessonClient
        subjectCode={code}
        subjectName={course.name}
        lesson={lesson}
        enriched={enriched}
        pastPaperQuestions={pastPaperQuestions}
        lessons={lessons}
        paperQuery={paperQuery}
      />
    </>
  )
}
