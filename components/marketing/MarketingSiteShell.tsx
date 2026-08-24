import type { ReactNode } from 'react'
import { CourseProgressCloudSync } from '@/components/courses/CourseProgressCloudSync'
import { ShellReadingProgress } from '@/components/courses/margin-notes/ShellReadingProgress'
import { TapFeedbackLayer } from '@/components/courses/margin-notes/TapFeedbackLayer'
import { COURSE_TAP_CONFIG } from '@/lib/hooks/useTapFeedback'
import { ScrollProgressBar } from '@/components/design-system/ScrollProgressBar'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { MarketingTapFeedbackLayer } from '@/components/layout/MarketingTapFeedbackLayer'
import { BackToTop } from '@/components/marketing/BackToTop'

/**
 * Chrome for the marketing surface, split by variant instead of chosen per
 * request.
 *
 * This was one component that read `x-pathname` from `headers()` and branched on
 * `getSiteChromeVariant(pathname)`. Reading headers in a layout opts its whole
 * route group out of static generation, so that single call made every blog
 * post, IB hub and board page server-render on demand: a production build
 * reported 233 dynamic routes against 5 SSG, and the 34 marketing pages that
 * export `generateStaticParams` were prerendering nothing.
 *
 * The variant was always knowable at build time — `getSiteChromeVariant` is a
 * pure prefix match over the pathname, and the pathname is the route. So the
 * decision now lives in the route tree: `app/(marketing)/(reading|chrome|bare)/`
 * each render one of these directly, and nothing reads a request header.
 *
 * Chrome stays server-rendered on purpose. Moving it to a client component would
 * also have removed the headers() call (see the deleted MarketingLayoutChrome,
 * which did exactly that and was never wired up), but it would have taken the
 * header and footer out of the initial HTML — and site-wide nav and footer links
 * are internal-linking signal across ~3,000 pages.
 */

/** Margin Notes reading chrome: courses, subjects, pricing. */
export function ReadingShell({ children }: { children: ReactNode }) {
  return (
    <div className="course-root min-w-0 overflow-x-clip">
      <CourseProgressCloudSync />
      <ShellReadingProgress />
      <TapFeedbackLayer rootSelector=".course-root" config={COURSE_TAP_CONFIG} />
      <SiteHeader variant="reading" />
      {children}
      <BackToTop />
      <SiteFooter variant="reading" />
    </div>
  )
}

/** Standard marketing chrome: home, blog, board hubs, tools, community. */
export function MarketingShell({ children }: { children: ReactNode }) {
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

/** Routes that own their chrome entirely: /demo, /r, /for-teachers/start. */
export function BareShell({ children }: { children: ReactNode }) {
  return <>{children}</>
}
