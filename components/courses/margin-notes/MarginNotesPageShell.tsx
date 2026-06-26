'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { ReadingProgress } from '@/components/courses/margin-notes/ReadingProgress'
import { TapFeedbackRoot } from '@/components/courses/margin-notes/TapFeedbackRoot'
import { CourseProgressCloudSync } from '@/components/courses/CourseProgressCloudSync'

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
      <CourseProgressCloudSync />
      {showReadingProgress ? <ReadingProgress accent={readingAccent} /> : null}
      <SiteHeader variant="reading" />
      {children}
      <SiteFooter variant="reading" />
    </TapFeedbackRoot>
  )
}
