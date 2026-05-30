const MARKETING_PREFIXES = [
  '/subjects',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/privacy',
  '/terms',
] as const

const AUTH_PREFIX = '/auth'
const NO_HEADER_PREFIXES = ['/onboarding', '/join']

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
  if (NO_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  return true
}

export const MARKETING_ROUTES = [
  '/',
  '/subjects',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/privacy',
  '/terms',
] as const
