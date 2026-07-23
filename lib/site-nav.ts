import { MARKETING_NAV } from '@/lib/site-config'

export type NavDropdownItem = { href: string; label: string; sublabel?: string }

export type SiteNavItem = {
  id: string
  href: string
  label: string
  children?: NavDropdownItem[]
  isActive: (pathname: string) => boolean
  /** Which header variants show this item. */
  variants: Array<'marketing' | 'app' | 'reading'>
}

/** Subjects dropdown — both boards under one menu. */
export const SUBJECTS_DROPDOWN: NavDropdownItem[] = [
  { href: '/subjects', label: 'A-Level', sublabel: 'Cambridge International' },
  { href: '/ib', label: 'IB Diploma', sublabel: 'HL & SL past papers' },
  { href: '/ib/courses', label: 'IB free courses', sublabel: '760+ lessons · TOK · sciences' },
  { href: '/guides/ib', label: 'IB study guides', sublabel: 'Markbands & revision' },
]

function subjectsActive(pathname: string) {
  return (
    pathname === '/subjects' ||
    pathname.startsWith('/subjects/') ||
    pathname === '/ib' ||
    pathname.startsWith('/ib/')
  )
}

/** Single source of truth for primary navigation across all headers. */
export const SITE_NAV_ITEMS: SiteNavItem[] = [
  {
    // The signed-in daily landing. "Home" rather than "Dashboard" so it reads
    // as distinct from "Progress" — both said "your stats" before, which is
    // what made the two impossible to tell apart. Exact match only: its
    // sub-routes (/dashboard/progress, /dashboard/attempt) are their own items.
    id: 'home',
    href: '/dashboard',
    label: 'Home',
    variants: ['app'],
    isActive: (p) => p === '/dashboard',
  },
  {
    id: 'mark',
    href: '/mark',
    label: 'Mark',
    variants: ['marketing', 'app', 'reading'],
    isActive: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    id: 'courses',
    href: '/courses',
    label: 'Courses',
    variants: ['marketing', 'app', 'reading'],
    isActive: (p) =>
      p === '/courses' ||
      p.startsWith('/courses/') ||
      p.startsWith('/ib/courses'),
  },
  {
    id: 'subjects',
    href: '/subjects',
    label: 'Subjects',
    children: SUBJECTS_DROPDOWN,
    variants: ['marketing', 'app', 'reading'],
    isActive: subjectsActive,
  },
  {
    id: 'community',
    href: '/community',
    label: 'Community',
    variants: ['marketing', 'app', 'reading'],
    isActive: (p) => p === '/community' || p.startsWith('/community/'),
  },
  {
    id: 'guides',
    href: '/guides',
    label: 'Guides',
    children: [
      { href: '/guides', label: 'Revision guides', sublabel: 'Topic hubs by exam skill' },
      { href: '/blog', label: 'Blog', sublabel: 'Tips, mark schemes & strategy' },
      { href: '/tools', label: 'Free tools', sublabel: 'Grade calculator & command words' },
    ],
    variants: ['marketing', 'reading'],
    isActive: (p) => isGuidesBlogNavActive(p) || p === '/tools' || p.startsWith('/tools/'),
  },
  {
    id: 'pricing',
    href: '/pricing',
    label: 'Pricing',
    variants: ['marketing', 'reading'],
    isActive: (p) => p === '/pricing',
  },
  {
    id: 'progress',
    href: '/dashboard/progress',
    label: 'Progress',
    variants: ['app'],
    // No longer claims /dashboard — that is Home. Progress owns its own page,
    // the per-attempt detail that opens from it, and "Review your misses"
    // (/dashboard/review), which is a progress activity and opens attempt pages.
    isActive: (p) =>
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/') ||
      p.startsWith('/dashboard/review'),
  },
  {
    id: 'account',
    href: '/account',
    label: 'Account',
    variants: ['app'],
    isActive: (p) => p.startsWith('/account'),
  },
]

export type SiteHeaderVariant = 'marketing' | 'app' | 'reading'

export function getNavItemsForVariant(variant: SiteHeaderVariant): SiteNavItem[] {
  return SITE_NAV_ITEMS.filter((item) => item.variants.includes(variant))
}

/** Blog + guides + tools share one nav item — active on any of those routes. */
export function isGuidesBlogNavActive(pathname: string) {
  return (
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/guides' ||
    pathname.startsWith('/guides/') ||
    pathname === '/tools' ||
    pathname.startsWith('/tools/')
  )
}

/** Secondary links — mobile menu overflow + footer. */
export const MARKETING_NAV_SECONDARY = MARKETING_NAV.filter(
  (item) => !SITE_NAV_ITEMS.some((p) => p.href === item.href)
).map((item) => ({ href: item.href, label: item.label }))

/** @deprecated Use SITE_NAV_ITEMS — kept for import compatibility. */
export type AppNavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
  children?: NavDropdownItem[]
}

export const APP_NAV_ITEMS: AppNavItem[] = getNavItemsForVariant('app').map((item) => ({
  href: item.href,
  label: item.label,
  isActive: item.isActive,
  children: item.children,
}))

/** @deprecated Use SITE_NAV_ITEMS — kept for import compatibility. */
export const MARKETING_NAV_PRIMARY = getNavItemsForVariant('marketing').map((item) => ({
  href: item.href,
  label: item.label,
  children: item.children,
}))

export const FOOTER_PRODUCT_LINKS = [
  { href: '/mark', label: 'Mark a question' },
  { href: '/past-papers', label: 'Past papers' },
  { href: '/ib', label: 'IB past papers' },
  { href: '/ib/courses', label: 'IB free courses' },
  { href: '/courses', label: 'Free courses' },
  { href: '/tools/grade-boundary-calculator', label: 'Grade calculator' },
  { href: '/tools/command-words', label: 'Command words' },
  { href: '/tools/ib-points-calculator', label: 'IB points calculator' },
  { href: '/tools/pum-calculator', label: 'PUM / UMS calculator' },
  { href: '/tools/exam-countdown', label: 'Exam countdown' },
  { href: '/pricing', label: 'Pricing' },
]

export const FOOTER_SUBJECT_LINKS = [
  { href: '/subjects/9709', label: '9709 Mathematics' },
  { href: '/subjects/9702', label: '9702 Physics' },
  { href: '/ib/subjects/tok', label: 'IB TOK' },
  { href: '/ib/subjects/biology-hl', label: 'IB Biology HL' },
  { href: '/subjects', label: 'All Cambridge subjects' },
  { href: '/ib/subjects', label: 'All IB subjects' },
]

export const FOOTER_COMPANY_LINKS = [
  { href: '/about', label: 'The story' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/for-teachers', label: 'For teachers' },
  { href: '/faq', label: 'FAQ' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/guides', label: 'Guides & blog' },
  { href: '/guides/ib', label: 'IB study guides' },
  { href: '/how-it-works#honest', label: 'Honest about AI' },
  { href: '/contact', label: 'Contact' },
]

export const FOOTER_LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/cookies', label: 'Cookies' },
]

/** Public social profiles — keep in sync with Organization.sameAs (lib/seo/entity.ts). */
export const FOOTER_SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/markscheme.app', label: 'Instagram', icon: 'instagram' as const },
  { href: 'https://www.tiktok.com/@markscheme', label: 'TikTok', icon: 'tiktok' as const },
  { href: 'https://twitter.com/MarkSchemeApp', label: 'Twitter', icon: 'twitter' as const },
  { href: 'https://www.youtube.com/@MarkSchemeApp', label: 'YouTube', icon: 'youtube' as const },
  { href: 'https://www.linkedin.com/company/markscheme/', label: 'LinkedIn', icon: 'linkedin' as const },
]
