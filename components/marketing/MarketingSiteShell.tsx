import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { CourseProgressCloudSync } from '@/components/courses/CourseProgressCloudSync'
import { ReadingProgress } from '@/components/courses/margin-notes/ReadingProgress'
import { TapFeedbackLayer } from '@/components/courses/margin-notes/TapFeedbackLayer'
import { COURSE_TAP_CONFIG } from '@/lib/hooks/useTapFeedback'
import { ScrollProgressBar } from '@/components/design-system/ScrollProgressBar'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { MarketingTapFeedbackLayer } from '@/components/layout/MarketingTapFeedbackLayer'
import { BackToTop } from '@/components/marketing/BackToTop'
import { getSiteChromeVariant } from '@/lib/site-chrome'

function isLessonPath(pathname: string): boolean {
  return (
    /^\/courses\/[^/]+\/.+/.test(pathname) ||
    /^\/ib\/courses\/[^/]+\/.+/.test(pathname)
  )
}

export async function getRequestPathname(): Promise<string> {
  const h = await headers()
  return h.get('x-pathname') ?? h.get('x-invoke-path') ?? '/'
}

/** Server layout shell: keeps page content out of client boundaries for crawlable HTML. */
export async function MarketingSiteShell({ children }: { children: ReactNode }) {
  const pathname = await getRequestPathname()
  const variant = getSiteChromeVariant(pathname)

  if (variant === 'reading') {
    return (
      <div className="course-root min-w-0 overflow-x-clip">
        <CourseProgressCloudSync />
        {!isLessonPath(pathname) ? <ReadingProgress /> : null}
        <TapFeedbackLayer rootSelector=".course-root" config={COURSE_TAP_CONFIG} />
        <SiteHeader variant="reading" />
        {children}
        <BackToTop />
        <SiteFooter variant="reading" />
      </div>
    )
  }

  if (variant === 'marketing') {
    return (
      <div className="ec-marketing-root min-h-full">
        <MarketingTapFeedbackLayer />
        <ScrollProgressBar />
        <SiteHeader variant="marketing" />
        {children}
        <BackToTop />
        <SiteFooter variant="marketing" />
      </div>
    )
  }

  return children
}
