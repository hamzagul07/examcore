'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'
import type { CourseLesson, PastPaperQuestionRef } from '@/lib/courses/types'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import type { LessonStudyBridge } from '@/lib/curriculum-graph/study-bridges'
import { adaptLesson } from '@/lib/courses/margin-notes/adapt-lesson'
import { buildFlatTopics } from '@/lib/courses/margin-notes/adapt-spine'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'
import { filterLessonsByPaper, findPaperTrack } from '@/lib/courses/paper-tracks'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useBillingAccess } from '@/lib/hooks/useBillingAccess'
import { CourseLessonPage } from '@/components/courses/margin-notes/CourseLessonPage'
import type { CriterionLadderData } from '@/lib/courses/criterion-ladder.server'
import { LessonPageSkeleton } from '@/components/courses/margin-notes/MarginNotesSkeletons'
import { ApLessonBridge } from '@/components/seo/ApLessonBridge'
import { AqaLessonBridge } from '@/components/seo/AqaLessonBridge'
import { EdexcelLessonBridge } from '@/components/seo/EdexcelLessonBridge'
import { OxfordaqaLessonBridge } from '@/components/seo/OxfordaqaLessonBridge'

type StudyQuery = {
  board: string | null
  unit: string | null
  subject: string | null
  paper: string | null
}

/**
 * The lesson's query-string concerns (?board/&unit/&subject study bridge,
 * ?paper filter), read AFTER mount so the page itself can prerender.
 *
 * These used to be read server-side from `searchParams` — which forced every
 * flat lesson to render per request. The prerendered HTML is the no-query
 * default (correct for every crawler and for most students); arrivals from a
 * board study path get their bridge strip and board-flavored CTAs one paint
 * after hydration. popstate is tracked so back/forward between queried and
 * plain URLs stays honest.
 */
function useStudyQuery(): StudyQuery | null {
  const [query, setQuery] = useState<StudyQuery | null>(null)
  useEffect(() => {
    const read = () => {
      const sp = new URLSearchParams(window.location.search)
      setQuery({
        board: sp.get('board')?.trim().toLowerCase() || null,
        unit: sp.get('unit')?.trim().toUpperCase() || null,
        subject: sp.get('subject')?.trim().toLowerCase() || null,
        paper: sp.get('paper') || null,
      })
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])
  return query
}

type Props = {
  subjectCode: string
  subjectName: string
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
  pastPaperQuestions: PastPaperQuestionRef[]
  lessons: CourseLessonNav[]
  paperQuery?: string | null
  basePath?: string
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
  /** Verbatim IB criteria for this lesson's component, fetched server-side. */
  criterionLadder?: CriterionLadderData | null
  /** When set (e.g. Edexcel study path), practice CTAs use this mark deep-link. */
  markHrefOverride?: string | null
  markCtaLabel?: string
  /**
   * Board study contexts this lesson can host, precomputed at build
   * (getStudyBridgesForLesson). The active one — if the visitor arrived with
   * a matching ?board query — is picked client-side. Server-passed
   * markHrefOverride/markCtaLabel/paperQuery (paper-pilot route, IB route)
   * always win over the client-derived values.
   */
  studyBridges?: LessonStudyBridge[]
}

export function CourseLessonClient({
  subjectCode,
  subjectName,
  lesson,
  enriched,
  pastPaperQuestions,
  lessons,
  paperQuery,
  basePath,
  coursesCrumb,
  community,
  criterionLadder,
  markHrefOverride,
  markCtaLabel,
  studyBridges,
}: Props) {
  const { done } = useCourseProgress(subjectCode)
  const { user, loading: authLoading } = useAuthCheck()
  const { access } = useBillingAccess()

  const studyQuery = useStudyQuery()
  const activeBridge = useMemo(() => {
    if (!studyQuery?.board || !studyBridges?.length) return null
    const key = studyQuery.board === 'edexcel' ? studyQuery.unit : studyQuery.subject
    if (!key) return null
    return (
      studyBridges.find((b) => b.board === studyQuery.board && b.key === key) ?? null
    )
  }, [studyQuery, studyBridges])

  const effPaperQuery = paperQuery ?? studyQuery?.paper ?? null
  const effMarkHrefOverride = markHrefOverride ?? activeBridge?.markHref ?? null
  const effMarkCtaLabel =
    markCtaLabel ?? (activeBridge ? `Mark ${activeBridge.label}` : undefined)

  const track = findPaperTrack(subjectCode, lessons, effPaperQuery)
  const scoped = track ? filterLessonsByPaper(lessons, track) : lessons
  const flat = useMemo(
    () => buildFlatTopics(scoped, done, lesson.slug),
    [scoped, done, lesson.slug]
  )

  const adapted = useMemo(
    () =>
      adaptLesson(subjectCode, subjectName, lesson, pastPaperQuestions, flat, {
        enriched,
      }),
    [subjectCode, subjectName, lesson, pastPaperQuestions, flat, enriched]
  )

  return (
    <>
      {activeBridge?.board === 'edexcel' ? (
        <EdexcelLessonBridge
          unitCode={activeBridge.key}
          markHref={activeBridge.markHref}
          unitHubHref={activeBridge.hubHref}
          nextLesson={activeBridge.nextLesson}
        />
      ) : activeBridge?.board === 'oxfordaqa' ? (
        <OxfordaqaLessonBridge
          contentCode={activeBridge.key}
          label={activeBridge.label}
          markHref={activeBridge.markHref}
          subjectHubHref={activeBridge.hubHref}
          nextLesson={activeBridge.nextLesson}
        />
      ) : activeBridge?.board === 'aqa' ? (
        <AqaLessonBridge
          contentCode={activeBridge.key}
          label={activeBridge.label}
          markHref={activeBridge.markHref}
          subjectHubHref={activeBridge.hubHref}
          nextLesson={activeBridge.nextLesson}
        />
      ) : activeBridge?.board === 'ap' ? (
        <ApLessonBridge
          contentCode={activeBridge.key}
          label={activeBridge.label}
          markHref={activeBridge.markHref}
          subjectHubHref={activeBridge.hubHref}
          nextLesson={activeBridge.nextLesson}
        />
      ) : null}
      <Suspense fallback={<LessonPageSkeleton />}>
        <CourseLessonPage
          lesson={adapted}
          subjectAcc={subjectAccent(subjectCode)}
          paperQuery={effPaperQuery}
          signedIn={authLoading ? undefined : !!user}
          access={access}
          basePath={basePath}
          coursesCrumb={coursesCrumb}
          community={community}
          criterionLadder={criterionLadder}
          markHrefOverride={effMarkHrefOverride}
          markCtaLabel={effMarkCtaLabel}
          studyQuery={studyQuery}
        />
      </Suspense>
    </>
  )
}
