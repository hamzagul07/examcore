import { resolveSiteUrl } from '@/lib/site-url'

/** Public site origin — see resolveSiteUrl() for env precedence. */
export const SITE_URL = resolveSiteUrl()

/** Hostname for display copy (e.g. privacy policy, hero mockup). */
export const SITE_HOST = new URL(SITE_URL).host

export const SITE_NAME = 'MarkScheme'

/** Short line for OG images, manifest, and hero subcopy. */
export const SITE_TAGLINE =
  'Cambridge past papers, marked mark-by-mark'

export const CONTACT_EMAIL = 'hello@markscheme.app'

/** Default meta description — Cambridge + handwriting + real mark schemes. */
export const DEFAULT_SITE_DESCRIPTION =
  'Upload handwritten Cambridge A-Level and O-Level past-paper answers. Get instant mark-by-mark feedback tied to real mark schemes — B1, M1, A1, essay bands, and whole papers.'

/** Shared SEO keywords — see lib/seo/keywords.ts for research clusters. */
export { SEO_KEYWORDS } from '@/lib/seo/keywords'

export const MARKETING_NAV = [
  { href: '/mark', label: 'Mark a paper' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
] as const
