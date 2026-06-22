'use client'

import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { SubjectsDirectoryPage } from '@/components/courses/margin-notes/SubjectsDirectoryPage'

export function SubjectsDirectoryClient({ subjects }: { subjects: MarginNotesSubject[] }) {
  return <SubjectsDirectoryPage subjects={subjects} />
}
