'use client'

import { usePathname } from 'next/navigation'
import { ScrollProgressBar } from '@/components/design-system/ScrollProgressBar'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { MarginNotesPageShell } from '@/components/courses/margin-notes/MarginNotesPageShell'
import { getSiteChromeVariant } from '@/lib/site-chrome'

function isLessonPath(pathname: string): boolean {
  return /^\/courses\/[^/]+\/.+/.test(pathname)
}

export function MarketingLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const variant = getSiteChromeVariant(pathname)

  if (variant === 'reading') {
    return (
      <MarginNotesPageShell showReadingProgress={!isLessonPath(pathname)}>
        {children}
      </MarginNotesPageShell>
    )
  }

  if (variant === 'marketing') {
    return (
      <>
        <ScrollProgressBar />
        <SiteHeader variant="marketing" />
        {children}
        <SiteFooter variant="marketing" />
      </>
    )
  }

  return <>{children}</>
}
