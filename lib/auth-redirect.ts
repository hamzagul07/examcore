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
    const trimmed = next.trim()
    // Avoid /onboarding?next=/onboarding redirect loops after sign-in.
    if (trimmed === '/onboarding' || trimmed.startsWith('/onboarding?')) {
      return onboarded ? '/dashboard' : '/onboarding'
    }
    const authOnly = trimmed.startsWith('/auth/')
    if (onboarded || authOnly) return trimmed
    return `/onboarding?next=${encodeURIComponent(trimmed)}`
  }
  return onboarded ? '/dashboard' : '/onboarding'
}

/** Marketing signup — no redirect param; onboarding runs first. */
export function buildMarketingSignUpHref(): string {
  return '/auth/signup'
}

/** Read `next` or legacy `redirect` from auth page query strings. */
export function readPostAuthNextParam(
  rawNext?: string | null,
  rawRedirect?: string | null
): string | null {
  if (isSafeNextPath(rawNext)) return rawNext.trim()
  if (isSafeNextPath(rawRedirect)) return rawRedirect.trim()
  return null
}

/** `/auth/forgot-password` preserving post-reset destination. */
export function buildForgotPasswordHref(nextPath?: string | null): string {
  if (isSafeNextPath(nextPath)) {
    return `/auth/forgot-password?next=${encodeURIComponent(nextPath.trim())}`
  }
  return '/auth/forgot-password'
}

/**
 * Supabase recovery email callback — lands on reset page, optionally carrying
 * `?next=` for where to go after the password is updated.
 */
export function buildResetPasswordCallbackUrl(
  origin: string,
  returnTo?: string | null
): string {
  const base = origin.replace(/\/$/, '')
  let resetPath = '/auth/reset-password'
  if (isSafeNextPath(returnTo)) {
    resetPath += `?next=${encodeURIComponent(returnTo.trim())}`
  }
  return `${base}/auth/callback?next=${encodeURIComponent(resetPath)}`
}
