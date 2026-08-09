'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { getContinueLearning } from '@/lib/courses/margin-notes/continue-learning'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { CourseProgressCloudSync } from '@/components/courses/CourseProgressCloudSync'
import { ContinueLearningStrip } from '@/components/courses/margin-notes/ContinueLearningStrip'

type Props = {
  catalog: ContinueCatalogEntry[]
}

/** Margin Notes course strip for the signed-in dashboard home. */
export function DashboardCoursesPanel({ catalog }: Props) {
  const progressRev = useCourseProgressRevision()
  const cont = useMemo(
    () => getContinueLearning(catalog),
    [catalog, progressRev]
  )

  return (
    <section className="course-root mb-8" aria-label="Free courses">
      <CourseProgressCloudSync />
      {cont ? (
        <ContinueLearningStrip catalog={catalog} screenLabel="Dashboard — continue learning" />
      ) : (
        <div className="continue card dash-courses-start ms-dash-courses-start">
          <div className="continue-body">
            <p className="micro continue-kicker">FREE COURSES · DESK</p>
            <h3 className="h3 continue-title">
              Syllabus lessons — <em>every topic free</em>
            </h3>
            <p className="body-2 continue-blurb">
              Visual notes, flashcards, and a past-paper question per syllabus point.
            </p>
          </div>
          <Link className="continue-cta btn-primary sm" href="/courses">
            Browse courses -&gt;
          </Link>
        </div>
      )}
      <p className="micro dash-courses-foot">
        Marking insights live on{' '}
        <Link className="hub-sync-link" href="/dashboard/progress">
          your progress page -&gt;
        </Link>
      </p>
    </section>
  )
}
