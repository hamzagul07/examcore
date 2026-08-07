'use client'

import { Suspense, useMemo } from 'react'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'
import type { CourseLesson, PastPaperQuestionRef } from '@/lib/courses/types'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import { adaptLesson } from '@/lib/courses/margin-notes/adapt-lesson'
import { buildFlatTopics } from '@/lib/courses/margin-notes/adapt-spine'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'
import { filterLessonsByPaper, findPaperTrack } from '@/lib/courses/paper-tracks'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useBillingAccess } from '@/lib/hooks/useBillingAccess'
import { buildSignInHref } from '@/lib/auth-redirect'
import { CourseLessonPage } from '@/components/courses/margin-notes/CourseLessonPage'
import type { CriterionLadderData } from '@/lib/courses/criterion-ladder.server'
import { LessonPageSkeleton } from '@/components/courses/margin-notes/MarginNotesSkeletons'

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
}: Props) {
  const { done } = useCourseProgress(subjectCode)
  const { user, loading: authLoading } = useAuthCheck()
  const { access } = useBillingAccess()
  const track = findPaperTrack(subjectCode, lessons, paperQuery ?? null)
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
    <Suspense fallback={<LessonPageSkeleton />}>
      <CourseLessonPage
        lesson={adapted}
        subjectAcc={subjectAccent(subjectCode)}
        paperQuery={paperQuery}
        signedIn={authLoading ? undefined : !!user}
        access={access}
        basePath={basePath}
        coursesCrumb={coursesCrumb}
        community={community}
        criterionLadder={criterionLadder}
      />
    </Suspense>
  )
}
