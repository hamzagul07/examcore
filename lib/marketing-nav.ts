import { MARKETING_NAV } from '@/lib/site-config'

export type MarketingNavItem = {
  href: string
  label: string
  /** When present, this nav item is a dropdown of these links instead of a plain link. */
  children?: { href: string; label: string; sublabel?: string }[]
}

/** Subjects dropdown — both boards under one menu. Reused across all headers. */
export const SUBJECTS_DROPDOWN = [
  { href: '/subjects', label: 'A-Level', sublabel: 'Cambridge International' },
  { href: '/ib', label: 'IB Diploma', sublabel: 'HL & SL' },
]

/** Primary desktop nav — Margin Notes header (lowercase serif links). */
export const MARKETING_NAV_PRIMARY: MarketingNavItem[] = [
  { href: '/mark', label: 'Mark' },
  { href: '/courses', label: 'Courses' },
  { href: '/subjects', label: 'Subjects', children: SUBJECTS_DROPDOWN },
  { href: '/community', label: 'Community' },
  { href: '/pricing', label: 'Pricing' },
]

/** Blog + guides share one nav item — active on either route. */
export function isGuidesBlogNavActive(pathname: string) {
  return (
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/guides' ||
    pathname.startsWith('/guides/')
  )
}

/** Secondary links — mobile menu overflow + footer. */
export const MARKETING_NAV_SECONDARY: MarketingNavItem[] = MARKETING_NAV.filter(
  (item) => !MARKETING_NAV_PRIMARY.some((p) => p.href === item.href)
).map((item) => ({ href: item.href, label: item.label }))
