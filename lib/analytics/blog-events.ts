type BlogContinuePopupAction = 'signup' | 'dismiss' | 'community'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** GA4 — blog continue-reading popup (when NEXT_PUBLIC_GA_MEASUREMENT_ID is set). */
export function trackBlogContinuePopupClick(action: BlogContinuePopupAction, slug: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'blog_continue_popup_click', {
    action,
    slug,
    page_path: `/blog/${slug}`,
  })
}

/** @deprecated Use trackBlogContinuePopupClick */
export function trackBlogRevisionHubClick(action: 'signup' | 'guides' | 'community', slug: string): void {
  trackBlogContinuePopupClick(action === 'signup' ? 'signup' : 'community', slug)
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
