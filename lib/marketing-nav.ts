import { MARKETING_NAV } from '@/lib/site-config'

export type MarketingNavItem = {
  href: string
  label: string
}

/** Primary desktop nav — Margin Notes header (lowercase serif links). */
export const MARKETING_NAV_PRIMARY: MarketingNavItem[] = [
  { href: '/mark', label: 'Mark' },
  { href: '/courses', label: 'Courses' },
  { href: '/ib', label: 'IB' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/guides', label: 'Guides & blog' },
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
