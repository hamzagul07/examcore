/** Production site URL — set NEXT_PUBLIC_SITE_URL in env when domain is confirmed. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://examcore.ai'

export const SITE_NAME = 'Examcore'

export const CONTACT_EMAIL = 'hello@examcore.ai'

export const MARKETING_NAV = [
  { href: '/subjects', label: 'Subjects' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
] as const
