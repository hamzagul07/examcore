'use client'

import type { ReactNode } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { SubjectsDirectoryPage } from '@/components/courses/margin-notes/SubjectsDirectoryPage'
import { usePreferredSubjectCodes } from '@/lib/subjects/use-preferred-subject-codes'

export function SubjectsDirectoryClient({
  subjects,
  seoIntro,
}: {
  subjects: MarginNotesSubject[]
  seoIntro?: ReactNode
}) {
  const preferredCodes = usePreferredSubjectCodes()

  return (
    <SubjectsDirectoryPage
      subjects={subjects}
      seoIntro={seoIntro}
      preferredCodes={preferredCodes}
    />
  )
}
