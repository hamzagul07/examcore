/** App areas that require a signed-in account (proxy.ts). */
export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/account',
  '/onboarding',
  '/teacher',
  '/admin',
] as const

export function matchesRoutePrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function pathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

/**
 * Guest signup gate for deep content only — browse hubs & subject pages freely.
 * Guests redirect to /auth/signup (fade handoff); may skip and browse for the session.
 *
 * Public:  /courses, /courses/[code], /past-papers, /past-papers/[code],
 *          /past-papers/topics, /ib/courses, /ib/courses/[slug],
 *          /ib/past-papers, /ib/past-papers/[slug], /mark
 * Gated:   any topic / lesson URL below those subject hubs
 */
export function requiresGuestSignup(pathname: string): boolean {
  const parts = pathSegments(pathname)

  if (parts[0] === 'courses' && parts.length >= 3) {
    return true
  }

  if (parts[0] === 'past-papers' && parts.length >= 3 && parts[1] !== 'topics') {
    return true
  }

  if (parts[0] === 'ib' && parts[1] === 'courses' && parts.length >= 4) {
    return true
  }

  if (parts[0] === 'ib' && parts[1] === 'past-papers' && parts.length >= 4) {
    return true
  }

  return false
}

/** Signed-in users must finish onboarding before app + deep course/past-paper content. */
export function requiresOnboarding(pathname: string): boolean {
  if (matchesRoutePrefix(pathname, ['/dashboard', '/account', '/mark'])) {
    return true
  }
  return requiresGuestSignup(pathname)
}

export function requiresAccount(pathname: string): boolean {
  return matchesRoutePrefix(pathname, PROTECTED_ROUTE_PREFIXES)
}

/** Routes where proxy runs auth/onboarding checks (app shell + deep content). */
export function requiresAuthMiddleware(pathname: string): boolean {
  return requiresAccount(pathname) || requiresGuestSignup(pathname)
}
