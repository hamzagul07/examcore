'use client'

import { Suspense, useMemo } from 'react'
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
import { LessonPageSkeleton } from '@/components/courses/margin-notes/MarginNotesSkeletons'

type Props = {
  subjectCode: string
  subjectName: string
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
  pastPaperQuestions: PastPaperQuestionRef[]
  lessons: CourseLesson[]
  paperQuery?: string | null
  basePath?: string
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
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
}: Props) {
  const { done } = useCourseProgress(subjectCode)
  const { user, loading: authLoading } = useAuthCheck()
  const { access, trialEndsAt } = useBillingAccess()
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
        trialEndsAt={trialEndsAt}
        basePath={basePath}
        coursesCrumb={coursesCrumb}
        community={community}
      />
    </Suspense>
  )
}
