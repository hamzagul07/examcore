'use client'

import { useMemo } from 'react'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'
import { adaptCourseHub } from '@/lib/courses/margin-notes/adapt-course-hub'
import {
  completedSlugsForSubject,
  resolveActiveSlug,
} from '@/lib/courses/margin-notes/continue-learning'
import { subjectAccent, subjectGlyph } from '@/lib/courses/margin-notes/subject-meta'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { CourseHubPage } from '@/components/courses/margin-notes/CourseHubPage'

type Props = {
  code: string
  name: string
  level: string
  lessons: CourseLessonNav[]
  initialPaperNumber?: string | null
  basePath?: string
  coursesCrumb?: { label: string; href: string }
  /** Exam Room entry card — rendered from a server component parent. */
  community?: React.ReactNode
  /** Extra aside content (e.g. IB legitimate resources panel). */
  asideExtra?: React.ReactNode
  /** Board label for hub copy — defaults to Cambridge. */
  board?: 'cambridge' | 'ib'
}

function paperIdFromNumber(
  papers: ReturnType<typeof adaptCourseHub>['papers'],
  number: string | null | undefined
): number | undefined {
  if (!number) return undefined
  const match = papers.find((p) => p.number === number)
  return match?.id
}

export function CourseHubClient({
  code,
  name,
  level,
  lessons,
  initialPaperNumber,
  basePath,
  coursesCrumb,
  community,
  asideExtra,
  board = 'cambridge',
}: Props) {
  const { done } = useCourseProgress(code)
  const { user, loading: authLoading } = useAuthCheck()
  const completedSlugs = useMemo(() => {
    const fromStorage = completedSlugsForSubject(code)
    done.forEach((s) => fromStorage.add(s))
    return fromStorage
  }, [code, done])

  const activeSlug = resolveActiveSlug(
    code,
    lessons.map((l) => l.slug)
  )

  const course = useMemo(
    () => adaptCourseHub(code, name, lessons, completedSlugs, activeSlug),
    [code, name, lessons, completedSlugs, activeSlug]
  )
  const initialPaperId = paperIdFromNumber(course.papers, initialPaperNumber ?? null)
  const prog = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0
  const streakLabel =
    prog > 0 ? `${prog}% covered on this device` : 'New — start your streak today'

  return (
    <CourseHubPage
      code={code}
      name={name}
      level={level}
      acc={subjectAccent(code)}
      course={course}
      initialPaperId={initialPaperId}
      streakLabel={streakLabel}
      glyph={subjectGlyph(code, name)}
      signedIn={authLoading ? undefined : !!user}
      basePath={basePath}
      coursesCrumb={coursesCrumb}
      community={community}
      asideExtra={asideExtra}
      board={board}
    />
  )
}
