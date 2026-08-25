import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllCourseLessonPaths,
  getCourseLesson,
  getCourseLessons,
  getCourseSubject,
} from '@/lib/courses'
import type { CourseLesson } from '@/lib/courses/types'
import { buildCourseLessonSeo } from '@/lib/courses/seo'
import { fetchPastPaperQuestionsForTopic } from '@/lib/courses/past-paper-questions'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { getSubtopicsForLesson } from '@/lib/courses/syllabus-outcomes'
import { CourseLessonJsonLd } from '@/components/seo/CourseLessonJsonLd'
import { CourseLessonSeoIntro } from '@/components/courses/CourseLessonSeoIntro'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { CourseLessonClient } from '@/components/courses/margin-notes/CourseLessonClient'
import { getStudyBridgesForLesson } from '@/lib/curriculum-graph/study-bridges'
import { getCriterionLadder } from '@/lib/courses/criterion-ladder.server'
import { GuestSignupGate } from '@/components/auth/GuestSignupGate'
import { PremiumNudge } from '@/components/billing/PremiumNudge'
import { stripLessonsForNav } from '@/lib/courses/lesson-nav'
import { CommunityEntry } from '@/components/community/reddit/CommunityEntry'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { buildSubjectCourseSeo } from '@/lib/seo/subject-seo'

/**
 * Flat course lessons: /courses/{code}/{lessonSlug}.
 *
 * This route exists so the lesson library can prerender. The old catch-all
 * handled flat lessons AND paper-pilot paths, and read `searchParams` on the
 * server (pilot preview, study-bridge board query, paper filter) — one await
 * that turned ~1,700 static-able pages into per-request renders with no CDN
 * cache. The split gives each concern its own rendering mode:
 *
 *  - here: flat lessons, zero request reads, fully static. Study-bridge and
 *    ?paper handling moved client-side — the possible bridges are precomputed
 *    at build (getStudyBridgesForLesson) and the client picks from
 *    location.search after mount.
 *  - [...slug]: paper-pilot paths only (2 segments), still dynamic, keeps the
 *    ?pilot author-preview query. Next prefers this explicit single-segment
 *    route for 1-segment paths, the catch-all for the rest.
 *
 * Consequence of static rendering, accepted deliberately: the practice
 * questions and the community teaser are fetched at build, so they refresh per
 * deploy rather than per request. Deploys are frequent; TTFB for every
 * student beats a fresher teaser card. If a build-time Supabase blip breaks a
 * fetch, the practice questions fall back to canned ones (see
 * fetchPastPaperQuestionsForTopic) and the deploy retry is one click.
 */

type Props = {
  params: Promise<{ code: string; lessonSlug: string }>
}

export async function generateStaticParams() {
  return getAllCourseLessonPaths().map(({ code, slug }) => ({
    code,
    lessonSlug: slug,
  }))
}

export async function generateMetadata({ params }: Props) {
  const { code, lessonSlug } = await params

  const lesson = getCourseLesson(code, lessonSlug)
  if (!lesson) return {}

  const course = getCourseSubject(code)
  if (!course) return {}

  const seo = buildCourseLessonSeo(course, lesson)
  const path = `/courses/${code}/${lessonSlug}`
  // Breadcrumb leaf already prefers the CAIE graph URL when indexable.
  const graphCanonical = seo.breadcrumbs[seo.breadcrumbs.length - 1]?.path
  const canonicalPath = graphCanonical?.startsWith('/caie/') ? graphCanonical : path
  const subjectSeo = buildSubjectCourseSeo(course, course.lessonCount)
  const isPublished = lesson.status === 'premium' || lesson.status === 'published'
  const modified = lesson.updated ? `${lesson.updated}T12:00:00.000Z` : undefined
  const hasCaieCanonical = Boolean(canonicalPath?.startsWith('/caie/'))

  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path,
    canonicalPath,
    keywords: seo.keywords,
    ogImagePath: subjectSeo.ogImagePath,
    ogType: isPublished ? 'article' : 'website',
    publishedTime: modified,
    modifiedTime: modified,
    // When the CAIE graph owns the URL, keep /courses/... out of the index —
    // sitemap + canonical + robots should all prefer /caie/...
    index: lesson.status !== 'pilot' && !hasCaieCanonical,
  })
}

export default async function CourseLessonFlatPage({ params }: Props) {
  const { code, lessonSlug } = await params

  const lesson = getCourseLesson(code, lessonSlug)
  if (!lesson) notFound()

  const course = getCourseSubject(code)
  if (!course) notFound()

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
  const isPilotLesson = lesson.status === 'pilot'
  const communityOn = isCommunityEnabled()
  const lessonPath = `/courses/${code}/${lessonSlug}`
  // The board study bridges this lesson can host, baked into the static page.
  // Crawlers never carry the ?board query, so the server render (and the SEO
  // intro's mark link below) always shows the default; the client upgrades.
  const studyBridges = getStudyBridgesForLesson(lessonPath)
  const markPath = appendMarkReturn(seo.markPath, lessonPath, lesson.topicCode)

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

      <GuestSignupGate>
        <CourseLessonClient
          criterionLadder={criterionLadder}
          subjectCode={code}
          subjectName={course.name}
          lesson={lessonForClient}
          enriched={enriched}
          pastPaperQuestions={pastPaperQuestions}
          lessons={stripLessonsForNav(lessons)}
          studyBridges={studyBridges.length ? studyBridges : undefined}
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

      {/* Founder ask: premium discoverable on content surfaces. Client-gated to
          free/signed-out, so the page stays static. */}
      {!isPilotLesson ? <PremiumNudge surface="lesson" /> : null}

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
            markCtaLabel="Mark a past paper"
          />
        </div>
      ) : null}
    </>
  )
}
