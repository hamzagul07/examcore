'use client'

import { Suspense } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { SubjectsDirectoryPage } from '@/components/courses/margin-notes/SubjectsDirectoryPage'
import { SubjectsPageSkeleton } from '@/components/courses/margin-notes/MarginNotesSkeletons'

export function SubjectsDirectoryClient({ subjects }: { subjects: MarginNotesSubject[] }) {
  return (
    <Suspense fallback={<SubjectsPageSkeleton />}>
      <SubjectsDirectoryPage subjects={subjects} />
    </Suspense>
  )
}
