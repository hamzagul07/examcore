/** Production site URL — set NEXT_PUBLIC_SITE_URL in env (e.g. https://markscheme.app). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://markscheme.app'

export const SITE_NAME = 'MarkScheme'

/** Short line for OG images, manifest, and hero subcopy. */
export const SITE_TAGLINE =
  'Cambridge past papers, marked mark-by-mark'

export const CONTACT_EMAIL = 'hello@markscheme.app'

/** Default meta description — Cambridge + handwriting + real mark schemes. */
export const DEFAULT_SITE_DESCRIPTION =
  'Upload handwritten Cambridge A-Level and O-Level past-paper answers. Get instant mark-by-mark feedback tied to real mark schemes — B1, M1, A1, essay bands, and whole papers.'

/** Shared SEO keywords for student revision search intent. */
export const SEO_KEYWORDS = [
  'Cambridge past papers',
  'A-Level marking',
  'O-Level marking',
  'mark scheme',
  'AI marking',
  'handwritten answers',
  'past paper feedback',
  'Cambridge International',
  'exam revision',
  'mark by mark',
] as const

export const MARKETING_NAV = [
  { href: '/subjects', label: 'Subjects' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
] as const
