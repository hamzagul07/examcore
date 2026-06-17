'use client'

import type { ReactNode } from 'react'
import { MarginNotesNav } from '@/components/courses/margin-notes/MarginNotesNav'
import { MarginNotesFooter } from '@/components/courses/margin-notes/MarginNotesFooter'
import { ReadingProgress } from '@/components/courses/margin-notes/ReadingProgress'
import { TapFeedbackRoot } from '@/components/courses/margin-notes/TapFeedbackRoot'

type Props = {
  children: ReactNode
  showReadingProgress?: boolean
  readingAccent?: string
}

export function MarginNotesPageShell({
  children,
  showReadingProgress = true,
  readingAccent,
}: Props) {
  return (
    <TapFeedbackRoot className="course-root min-w-0 overflow-x-clip">
      {showReadingProgress ? <ReadingProgress accent={readingAccent} /> : null}
      <MarginNotesNav />
      {children}
      <MarginNotesFooter />
    </TapFeedbackRoot>
  )
}
