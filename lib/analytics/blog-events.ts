type BlogRevisionHubAction = 'signup' | 'guides' | 'community'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** GA4 — blog revision hub invite clicks (when NEXT_PUBLIC_GA_MEASUREMENT_ID is set). */
export function trackBlogRevisionHubClick(action: BlogRevisionHubAction, slug: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'blog_revision_hub_click', {
    action,
    slug,
    page_path: `/blog/${slug}`,
  })
}

/** @deprecated Use trackBlogRevisionHubClick */
export function trackBlogPracticeClick(
  action: 'mark' | 'signup' | 'course',
  slug: string
): void {
  trackBlogRevisionHubClick(action === 'signup' ? 'signup' : 'guides', slug)
}

/** @deprecated Use trackBlogRevisionHubClick */
export function trackBlogSignupPromptClick(
  prompt: 'banner' | 'sticky',
  slug: string
): void {
  trackBlogRevisionHubClick('signup', slug)
}
