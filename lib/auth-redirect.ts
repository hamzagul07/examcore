/**
 * Validate a post-auth redirect target. Only same-origin relative paths are
 * allowed — rejects protocol-relative (`//evil.com`) and absolute URLs.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('://')
  ) {
    return fallback
  }
  return trimmed
}

/** True when `raw` is a safe in-app path (no fallback applied). */
export function isSafeNextPath(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const trimmed = raw.trim()
  return (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('://')
  )
}

/** `/auth/signup` preserving a post-auth destination (`redirect` query). */
export function buildSignUpHref(nextPath?: string | null): string {
  if (isSafeNextPath(nextPath)) {
    return `/auth/signup?redirect=${encodeURIComponent(nextPath.trim())}`
  }
  return '/auth/signup'
}

/** `/auth/signin` preserving a post-auth destination (`next` query). */
export function buildSignInHref(nextPath?: string | null): string {
  if (isSafeNextPath(nextPath)) {
    return `/auth/signin?next=${encodeURIComponent(nextPath.trim())}`
  }
  return '/auth/signin'
}

/**
 * Post-auth routing after OAuth / magic link.
 * New users must finish onboarding before app destinations (e.g. /mark).
 */
export function resolvePostAuthPath(
  onboarded: boolean,
  next: string | null | undefined
): string {
  if (next && isSafeNextPath(next)) {
    const authOnly = next.startsWith('/auth/')
    if (onboarded || authOnly) return next.trim()
    return `/onboarding?next=${encodeURIComponent(next.trim())}`
  }
  return onboarded ? '/dashboard' : '/onboarding'
}

/** Marketing signup — no redirect param; onboarding runs first. */
export function buildMarketingSignUpHref(): string {
  return '/auth/signup'
}
