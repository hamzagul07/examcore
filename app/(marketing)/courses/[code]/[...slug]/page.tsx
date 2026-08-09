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
import { getSubtopicsForLesson } from '@/lib/courses/syllabus-outcomes'
import { CourseLessonJsonLd } from '@/components/seo/CourseLessonJsonLd'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { CourseLessonClient } from '@/components/courses/margin-notes/CourseLessonClient'
import { AqaLessonBridge } from '@/components/seo/AqaLessonBridge'
import { EdexcelLessonBridge } from '@/components/seo/EdexcelLessonBridge'
import { OxfordaqaLessonBridge } from '@/components/seo/OxfordaqaLessonBridge'
import {
  aqaStudyLabel,
  aqaStudyLessonHref,
  aqaStudyMarkHref,
  aqaStudySubjectHubHref,
  parseAqaStudySubject,
} from '@/lib/aqa/study-path'
import {
  edexcelStudyLessonHref,
  edexcelStudyMarkHref,
  edexcelStudyUnitHubHref,
  parseEdexcelStudyUnit,
} from '@/lib/edexcel/study-path'
import {
  oxfordaqaStudyLabel,
  oxfordaqaStudyLessonHref,
  oxfordaqaStudyMarkHref,
  oxfordaqaStudySubjectHubHref,
  parseOxfordaqaStudySubject,
} from '@/lib/oxfordaqa/study-path'
import {
  verifiedCourseLessonsForAqaSubject,
  verifiedCourseLessonsForEdexcelUnit,
  verifiedCourseLessonsForOxfordaqaSubject,
} from '@/lib/curriculum-graph/verified-course-links'
import { getCriterionLadder } from '@/lib/courses/criterion-ladder.server'
import { GuestSignupGate } from '@/components/auth/GuestSignupGate'
import { stripLessonsForNav } from '@/lib/courses/lesson-nav'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { buildSubjectCourseSeo } from '@/lib/seo/subject-seo'

type Props = {
  params: Promise<{ code: string; slug: string[] }>
  searchParams: Promise<{
    pilot?: string
    paper?: string
    board?: string
    unit?: string
    subject?: string
  }>
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
  const legacyPath = `/courses/${code}/${lessonSlug}`
  const path =
    resolved.mode === 'paper' && resolved.paperDir
      ? `/courses/${code}/${resolved.paperDir}/${lessonSlug}${isPilotPreview ? '?pilot=1' : ''}`
      : legacyPath
  // Breadcrumb leaf already prefers the CAIE graph URL when indexable.
  const graphCanonical = seo.breadcrumbs[seo.breadcrumbs.length - 1]?.path
  const canonicalPath =
    !isPilotPreview && graphCanonical?.startsWith('/caie/')
      ? graphCanonical
      : legacyPath
  const subjectSeo = buildSubjectCourseSeo(course, course.lessonCount)
  const isPublished = lesson.status === 'premium' || lesson.status === 'published'
  const modified = lesson.updated ? `${lesson.updated}T12:00:00.000Z` : undefined

  const hasCaieCanonical =
    !isPilotPreview && Boolean(canonicalPath?.startsWith('/caie/'))

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
    // When the CAIE graph owns the URL, keep /courses/... out of the index —
    // sitemap + canonical + robots should all prefer /caie/...
    index: !isPilotPreview && lesson.status !== 'pilot' && !hasCaieCanonical,
  })
}

export default async function CourseLessonCatchAllPage({ params, searchParams }: Props) {
  const { code, slug } = await params
  const { pilot, paper, board, unit, subject: studySubject } = await searchParams
  const preferPublished = pilot === '0'
  const isPilotPreview = pilot === '1'

  const resolved = resolveLesson(code, slug, preferPublished)
  if (!resolved) notFound()

  const course = getCourseSubject(code)
  if (!course) notFound()

  const { lesson, lessonSlug } = resolved
  // Surface official Cambridge sub-topics: prefer authored ones, else derive from
  // the extracted syllabus outcomes (server-only data — kept off the client).
  const lessonForClient: CourseLesson = lesson.subtopics?.length
    ? lesson
    : { ...lesson, subtopics: getSubtopicsForLesson(code, lesson.topicCode) }
  const lessons = getCourseLessons(code)
  const pastPaperQuestions = await fetchPastPaperQuestionsForTopic(code, lesson.topicCode, 2)
  const enriched = enrichLessonVisual(code, lesson)
  // No-op for Cambridge codes: resolveComponent only maps IB subjects whose
  // criteria are actually loaded.
  const criterionLadder = await getCriterionLadder(code, lesson.paper)
  const seo = buildCourseLessonSeo(course, lesson)
  const subjectSeo = buildSubjectCourseSeo(course, course.lessonCount)
  const isPilotLesson = lesson.status === 'pilot' || isPilotPreview
  const paperQuery = paper ?? resolved.paperNumber ?? null
  const communityOn = isCommunityEnabled()
  const lessonPath = `/courses/${code}/${lessonSlug}`
  const edexcelUnit = parseEdexcelStudyUnit({ board, unit })
  const oxfordaqaSubject = parseOxfordaqaStudySubject({ board, subject: studySubject })
  const aqaSubject = parseAqaStudySubject({ board, subject: studySubject })
  const edexcelMarkPath = edexcelUnit
    ? edexcelStudyMarkHref(edexcelUnit, lessonPath, lesson.topicCode)
    : null
  const oxfordaqaMarkPath = oxfordaqaSubject
    ? oxfordaqaStudyMarkHref(oxfordaqaSubject, lessonPath, lesson.topicCode)
    : null
  const aqaMarkPath = aqaSubject
    ? aqaStudyMarkHref(aqaSubject, lessonPath, lesson.topicCode)
    : null
  const boardMarkPath = edexcelMarkPath ?? oxfordaqaMarkPath ?? aqaMarkPath
  const markPath =
    boardMarkPath ??
    appendMarkReturn(seo.markPath, lessonPath, lesson.topicCode)
  const markCtaLabel = edexcelUnit
    ? `Mark ${edexcelUnit}`
    : oxfordaqaSubject
      ? `Mark ${oxfordaqaStudyLabel(oxfordaqaSubject)}`
      : aqaSubject
        ? `Mark ${aqaStudyLabel(aqaSubject)}`
        : 'Mark a past paper'
  const edexcelUnitHub = edexcelUnit ? edexcelStudyUnitHubHref(edexcelUnit) : null
  const oxfordaqaHub = oxfordaqaSubject
    ? oxfordaqaStudySubjectHubHref(oxfordaqaSubject)
    : null
  const aqaHub = aqaSubject ? aqaStudySubjectHubHref(aqaSubject) : null
  const edexcelNextLesson = (() => {
    if (!edexcelUnit) return null
    const pathLessons = verifiedCourseLessonsForEdexcelUnit(edexcelUnit)
    const idx = pathLessons.findIndex((l) => l.href === lessonPath)
    const next = idx >= 0 ? pathLessons[idx + 1] : undefined
    if (!next) return null
    return {
      href: edexcelStudyLessonHref(next.href, edexcelUnit),
      title: next.title,
      topicCode: next.topicCode,
    }
  })()
  const oxfordaqaNextLesson = (() => {
    if (!oxfordaqaSubject) return null
    const pathLessons = verifiedCourseLessonsForOxfordaqaSubject(oxfordaqaSubject)
    const idx = pathLessons.findIndex((l) => l.href === lessonPath)
    const next = idx >= 0 ? pathLessons[idx + 1] : undefined
    if (!next) return null
    return {
      href: oxfordaqaStudyLessonHref(next.href, oxfordaqaSubject),
      title: next.title,
      topicCode: next.topicCode,
    }
  })()
  const aqaNextLesson = (() => {
    if (!aqaSubject) return null
    const pathLessons = verifiedCourseLessonsForAqaSubject(aqaSubject)
    const idx = pathLessons.findIndex((l) => l.href === lessonPath)
    const next = idx >= 0 ? pathLessons[idx + 1] : undefined
    if (!next) return null
    return {
      href: aqaStudyLessonHref(next.href, aqaSubject),
      title: next.title,
      topicCode: next.topicCode,
    }
  })()

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

      {isPilotLesson ? (
        <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pt-4 sm:px-6">
          <h1 className="mb-2 text-xl font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-2xl">
            {lesson.title}
          </h1>
        </div>
      ) : null}

      {edexcelUnit && edexcelMarkPath && edexcelUnitHub ? (
        <EdexcelLessonBridge
          unitCode={edexcelUnit}
          markHref={edexcelMarkPath}
          unitHubHref={edexcelUnitHub}
          nextLesson={edexcelNextLesson}
        />
      ) : null}

      {oxfordaqaSubject && oxfordaqaMarkPath && oxfordaqaHub ? (
        <OxfordaqaLessonBridge
          contentCode={oxfordaqaSubject}
          label={oxfordaqaStudyLabel(oxfordaqaSubject)}
          markHref={oxfordaqaMarkPath}
          subjectHubHref={oxfordaqaHub}
          nextLesson={oxfordaqaNextLesson}
        />
      ) : null}

      {aqaSubject && aqaMarkPath && aqaHub ? (
        <AqaLessonBridge
          contentCode={aqaSubject}
          label={aqaStudyLabel(aqaSubject)}
          markHref={aqaMarkPath}
          subjectHubHref={aqaHub}
          nextLesson={aqaNextLesson}
        />
      ) : null}

      <GuestSignupGate>
        <CourseLessonClient
          criterionLadder={criterionLadder}
          subjectCode={code}
          subjectName={course.name}
          lesson={lessonForClient}
          enriched={enriched}
          pastPaperQuestions={pastPaperQuestions}
          lessons={stripLessonsForNav(lessons)}
          paperQuery={paperQuery}
          markHrefOverride={boardMarkPath}
          markCtaLabel={
            edexcelUnit
              ? `Mark ${edexcelUnit}`
              : oxfordaqaSubject
                ? `Mark ${oxfordaqaStudyLabel(oxfordaqaSubject)}`
                : aqaSubject
                  ? `Mark ${aqaStudyLabel(aqaSubject)}`
                  : undefined
          }
          community={
            communityOn && !isPilotLesson ? (
              <div key="lesson-community" className="lesson-community">
                <CommunityEntry
                  subjectCode={code}
                  title={`Discuss ${lesson.title}`}
                />
              </div>
            ) : null
          }
        />
      </GuestSignupGate>

      {/* Search-intent intro. Deliberately BELOW the lesson: it is written for
          crawlers, and a student landing here should meet their lesson first,
          not marketing copy. Same DOM, same server render — only the order
          changed. */}
      {!isPilotLesson ? (
        <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 pb-10 pt-14 sm:px-6">
          <CourseLessonSeoIntro
            heading={seo.introHeading}
            paragraph={seo.introParagraph}
            subjectCode={code}
            subjectName={course.name}
            markPath={markPath}
            markCtaLabel={markCtaLabel}
          />
        </div>
      ) : null}
    </>
  )
}
