/**
 * Internal PageRank sculpting — concentrate links on money + pillar URLs.
 * Footer/nav should avoid spraying equity to low-value pages.
 */

export const MONEY_PAGES = ['/mark', '/pricing', '/auth/signup'] as const

export const HIGH_AUTHORITY_PATHS = [
  '/',
  '/guides',
  '/blog',
  '/subjects',
  '/how-it-works',
  '/faq',
] as const

/** Footer: max links per column; priority order. */
export const SCULPTED_FOOTER_PRODUCT = [
  { href: '/mark', label: 'Mark a paper' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/guides', label: 'Topic guides' },
  { href: '/pricing', label: 'Pricing' },
] as const

export const SCULPTED_FOOTER_RESOURCES = [
  { href: '/guides/past-paper-marking', label: 'Past paper marking' },
  { href: '/guides/mark-schemes', label: 'Mark schemes hub' },
  { href: '/guides/grade-boundaries', label: 'Grade boundaries' },
  { href: '/tools/grade-boundary-calculator', label: 'Grade calculator' },
  { href: '/tools/command-words', label: 'Command words' },
  { href: '/guides/subject-guides', label: 'Syllabus guides' },
] as const

/** Pages that should NOT receive footer sitewide links (save crawl budget). */
export const LOW_VALUE_PATHS = new Set([
  '/join',
  '/auth/signin',
  '/privacy',
  '/terms',
])
