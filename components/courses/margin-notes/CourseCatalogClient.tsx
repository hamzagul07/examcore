'use client'

import { useEffect, useState } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { subjectProgressPercent } from '@/lib/courses/margin-notes/continue-learning'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { CourseCatalogPage } from '@/components/courses/margin-notes/CourseCatalogPage'
import type { IbCatalogCard } from '@/lib/courses/ib-catalog-display'

export function CourseCatalogClient({
  subjects,
  continueCatalog,
  ibSubjects = [],
}: {
  subjects: MarginNotesSubject[]
  continueCatalog: ContinueCatalogEntry[]
  ibSubjects?: IbCatalogCard[]
}) {
  const progressRev = useCourseProgressRevision()
  const [withProg, setWithProg] = useState(subjects)
  const [withIbProg, setWithIbProg] = useState(ibSubjects)

  useEffect(() => {
    setWithProg(
      subjects.map((s) => ({
        ...s,
        prog: subjectProgressPercent(s.code, s.lessons),
      }))
    )
    setWithIbProg(
      ibSubjects.map((s) => ({
        ...s,
        prog: subjectProgressPercent(s.code, s.lessons),
      }))
    )
  }, [subjects, ibSubjects, progressRev])

  return (
    <CourseCatalogPage
      subjects={withProg}
      continueCatalog={continueCatalog}
      ibSubjects={withIbProg}
    />
  )
}
