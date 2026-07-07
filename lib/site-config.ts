import { resolveSiteUrl } from '@/lib/site-url'

/** Public site origin — see resolveSiteUrl() for env precedence. */
export const SITE_URL = resolveSiteUrl()

/** Hostname for display copy (e.g. privacy policy, hero mockup). */
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return 'markscheme.app'
  }
})()

export const SITE_NAME = 'MarkScheme'

/** Short line for OG images, manifest, and hero subcopy. */
export const SITE_TAGLINE =
  'Second-pass marking, free courses, Exam Room'

export const CONTACT_EMAIL = 'hello@markscheme.app'

/**
 * Twitter/X handle (including the leading @) for Twitter card attribution.
 * Leave empty to omit site/creator from the card.
 */
export const SITE_TWITTER = '@MarkSchemeApp'

/** Default meta description — marking, courses, and student community. */
export const DEFAULT_SITE_DESCRIPTION =
  'Scheme-aligned second-pass marking for Cambridge & IB past papers — upload handwriting for B1/M1/A1 and markband feedback, study free syllabus courses, and join Exam Room communities. Free tier.'

/** Shared SEO keywords — see lib/seo/keywords.ts for research clusters. */
export { SEO_KEYWORDS } from '@/lib/seo/keywords'

export const MARKETING_NAV = [
  { href: '/mark', label: 'Mark a paper' },
  { href: '/courses', label: 'Free courses' },
  { href: '/community', label: 'Exam Room' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/guides', label: 'Guides' },
] as const
