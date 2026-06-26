type BlogSignupPrompt = 'banner' | 'sticky'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** GA4 — blog guest signup prompt clicks (when NEXT_PUBLIC_GA_MEASUREMENT_ID is set). */
export function trackBlogSignupPromptClick(prompt: BlogSignupPrompt, slug: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'blog_signup_prompt_click', {
    prompt,
    slug,
    page_path: `/blog/${slug}`,
  })
}
