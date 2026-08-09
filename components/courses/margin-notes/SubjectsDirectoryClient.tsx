'use client'

import type { ReactNode } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { SubjectsDirectoryPage } from '@/components/courses/margin-notes/SubjectsDirectoryPage'

export function SubjectsDirectoryClient({
  subjects,
  seoIntro,
}: {
  subjects: MarginNotesSubject[]
  seoIntro?: ReactNode
}) {
  return <SubjectsDirectoryPage subjects={subjects} seoIntro={seoIntro} />
}
