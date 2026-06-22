/** Routes that use the Margin Notes nav/footer shell (not all marketing paths). */
export function isMarginNotesShellPath(pathname: string): boolean {
  return (
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/ib/courses' ||
    pathname.startsWith('/ib/courses/') ||
    pathname === '/subjects' ||
    pathname === '/pricing'
  )
}

/** Routes using MarketingHeader/Footer — must stay in sync with app/(marketing)/*. */
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

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true
  return MARKETING_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export function isAuthPath(pathname: string): boolean {
  return pathname === AUTH_PREFIX || pathname.startsWith(AUTH_PREFIX + '/')
}

export function shouldShowAppHeader(pathname: string): boolean {
  if (isMarketingPath(pathname)) return false
  if (isAuthPath(pathname)) return false
  if (NO_APP_CHROME_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  return true
}

/** Same route gate as app header — auth/onboarding gating happens in MobileTabBarGate. */
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
