'use client'

import { usePathname } from 'next/navigation'
import { ScrollProgressBar } from '@/components/design-system/ScrollProgressBar'
import { MarketingHeader } from '@/components/layout/MarketingHeader'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { MarginNotesPageShell } from '@/components/courses/margin-notes/MarginNotesPageShell'
import { isMarginNotesShellPath } from '@/lib/marketing-paths'

function isLessonPath(pathname: string): boolean {
  return /^\/courses\/[^/]+\/.+/.test(pathname)
}

export function MarketingLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isMarginNotesShellPath(pathname)) {
    return (
      <MarginNotesPageShell showReadingProgress={!isLessonPath(pathname)}>
        {children}
      </MarginNotesPageShell>
    )
  }

  return (
    <>
      <ScrollProgressBar />
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </>
  )
}
