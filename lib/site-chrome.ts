/**
 * Unified route classifier for site chrome (header/footer variant).
 * Replaces the split between isMarginNotesShellPath and ad-hoc marketing checks.
 */

export type SiteChromeVariant = 'reading' | 'marketing' | 'none'

/** Routes using the reading shell (Margin Notes aesthetic + unified header/footer). */
const READING_SHELL_PREFIXES = [
  '/courses',
  '/ib/courses',
  '/subjects',
  '/ib/subjects',
  '/pricing',
] as const

/** Routes using MarketingHeader/Footer when not in reading shell. */
const MARKETING_PREFIXES = [
  '/subjects',
  '/ib',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/guides',
  '/insights',
  '/compare',
  '/research',
  '/courses',
  '/past-papers',
  '/tools',
  '/privacy',
  '/terms',
  '/refunds',
  '/cookies',
  '/community',
  '/u',
] as const

const AUTH_PREFIX = '/auth'

/** Routes with their own chrome — no student app header or mobile tab bar. */
const NO_APP_CHROME_PREFIXES = ['/onboarding', '/join', '/teacher', '/admin', '/dashboard/progress']

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

/** @deprecated Use getSiteChromeVariant — kept for MarginNotesPageShell gate. */
export function isMarginNotesShellPath(pathname: string): boolean {
  return getSiteChromeVariant(pathname) === 'reading'
}

export function getSiteChromeVariant(pathname: string): SiteChromeVariant {
  if (pathname === '/') return 'marketing'
  if (READING_SHELL_PREFIXES.some((p) => matchesPrefix(pathname, p))) return 'reading'
  if (MARKETING_PREFIXES.some((p) => matchesPrefix(pathname, p))) return 'marketing'
  return 'none'
}

export function isMarketingPath(pathname: string): boolean {
  return getSiteChromeVariant(pathname) !== 'none'
}

export function isAuthPath(pathname: string): boolean {
  return pathname === AUTH_PREFIX || pathname.startsWith(AUTH_PREFIX + '/')
}

export function shouldShowAppHeader(pathname: string): boolean {
  if (isMarketingPath(pathname)) return false
  if (isAuthPath(pathname)) return false
  if (NO_APP_CHROME_PREFIXES.some((p) => matchesPrefix(pathname, p))) return false
  return true
}

export function shouldShowMobileTabBar(pathname: string): boolean {
  return shouldShowAppHeader(pathname)
}

export const MARKETING_ROUTES = [
  '/',
  '/subjects',
  '/ib',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/guides',
  '/insights',
  '/compare',
  '/research',
  '/courses',
  '/past-papers',
  '/tools',
  '/privacy',
  '/terms',
  '/refunds',
  '/cookies',
  '/community',
  '/u',
] as const
