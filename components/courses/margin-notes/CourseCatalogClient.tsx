'use client'

import { Suspense, useEffect, useState } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { subjectProgressPercent } from '@/lib/courses/margin-notes/continue-learning'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { CourseCatalogPage } from '@/components/courses/margin-notes/CourseCatalogPage'
import { CatalogPageSkeleton } from '@/components/courses/margin-notes/MarginNotesSkeletons'

export function CourseCatalogClient({
  subjects,
  continueCatalog,
}: {
  subjects: MarginNotesSubject[]
  continueCatalog: ContinueCatalogEntry[]
}) {
  const progressRev = useCourseProgressRevision()
  const [withProg, setWithProg] = useState(subjects)

  useEffect(() => {
    setWithProg(
      subjects.map((s) => ({
        ...s,
        prog: subjectProgressPercent(s.code, s.lessons),
      }))
    )
  }, [subjects, progressRev])

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CourseCatalogPage subjects={withProg} continueCatalog={continueCatalog} />
    </Suspense>
  )
}
