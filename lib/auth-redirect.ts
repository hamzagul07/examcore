/**
 * Characters that must never appear in a redirect target.
 *
 * WHATWG URL parsing treats `\` as `/` for http(s), so
 * `new URL('/\evil.com', 'https://markscheme.app').href === 'https://evil.com/'`
 * — a "relative" path that only rejects `//` and `://` still walks off-site.
 * Control characters are stripped by the parser (tab/newline anywhere, C0 at
 * the ends), which makes the checked string and the navigated string differ;
 * refuse them outright rather than reason about what survives.
 */
const FORBIDDEN_REDIRECT_CHARS = /[\\\u0000-\u001f\u007f]/

/**
 * Origin used only to *probe* whether a path stays relative. Any origin works:
 * a path is same-origin-safe exactly when resolving it against a base leaves
 * the base's origin unchanged, and that property does not depend on the host.
 */
const PROBE_ORIGIN = 'https://redirect-probe.invalid'

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    // Malformed percent-encoding — leave as-is; the raw check still applies.
    return value
  }
}

/**
 * True when `value` (raw or after one round of percent-decoding) carries a
 * backslash or control character. The decoded pass covers `%5C`: the string
 * is safe as-is, but any consumer that decodes before re-resolving (routers,
 * log viewers, a copy-pasted address bar) would see the backslash.
 */
function hasForbiddenRedirectChars(value: string): boolean {
  return (
    FORBIDDEN_REDIRECT_CHARS.test(value) ||
    FORBIDDEN_REDIRECT_CHARS.test(safeDecode(value))
  )
}

/**
 * Resolve `raw` against `origin` and return `pathname + search + hash` only —
 * or `null` when the result would leave that origin.
 *
 * This is the last line of defence at every redirect sink that does
 * `new URL(dest, request.url)`: the sanitizers above it reason about string
 * shape, this one asks the URL parser itself where the browser would end up.
 * Absolute URLs on the same origin collapse to their path, which is what a
 * `Location` header should carry anyway.
 */
export function resolveSameOriginPath(
  raw: string | null | undefined,
  origin: string
): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed || hasForbiddenRedirectChars(trimmed)) return null

  let base: URL
  try {
    base = new URL(origin)
  } catch {
    return null
  }

  let resolved: URL
  try {
    resolved = new URL(trimmed, base.origin)
  } catch {
    return null
  }

  if (resolved.origin !== base.origin) return null

  // Dot segments are collapsed BEFORE the origin check, so `/..//evil.com`
  // (also `/a/..//evil.com`, `/.//evil.com`, `/%2e%2e//evil.com`) is
  // same-origin with pathname `//evil.com` — and that pathname, handed to a
  // sink that does `new URL(path, request.url)`, is protocol-relative and
  // walks off-site. The path we return must never begin that way.
  if (resolved.pathname.startsWith('//')) return null

  const candidate = `${resolved.pathname}${resolved.search}${resolved.hash}`

  // What is returned is what every sink re-resolves. Prove, on the string
  // actually handed back rather than on the input, that it lands on this
  // origin; any future parser subtlety fails closed here.
  try {
    if (new URL(candidate, base.origin).origin !== base.origin) return null
  } catch {
    return null
  }
  return candidate
}

/**
 * The same check, returning the absolute same-origin URL a redirect should
 * carry — or `null`. Server sinks redirect to THIS rather than re-resolving
 * the path string against `request.url`: the string form is safe (see
 * above), but a URL that was built once, here, on the checked origin has no
 * second resolution step in which to go wrong.
 */
export function resolveSameOriginUrl(
  raw: string | null | undefined,
  origin: string
): URL | null {
  const path = resolveSameOriginPath(raw, origin)
  if (path === null) return null
  try {
    const base = new URL(origin)
    const url = new URL(path, base.origin)
    return url.origin === base.origin ? url : null
  } catch {
    return null
  }
}

/**
 * Shared shape check for an in-app path: leading `/`, not protocol-relative,
 * no scheme, no backslash / control characters, and — decisive — the URL
 * parser agrees it stays on the current origin.
 */
function isInAppPath(trimmed: string): boolean {
  if (!trimmed.startsWith('/')) return false
  if (trimmed.startsWith('//')) return false
  if (trimmed.includes('://')) return false
  if (hasForbiddenRedirectChars(trimmed)) return false
  return resolveSameOriginPath(trimmed, PROBE_ORIGIN) !== null
}

/**
 * Validate a post-auth redirect target. Only same-origin relative paths are
 * allowed — rejects protocol-relative (`//evil.com`), absolute URLs, and the
 * backslash / control-character forms the URL parser would turn into either.
 * The marketing homepage (`/`) is never a post-login destination — signed-in
 * users belong on the dashboard desk.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (trimmed === '/' || trimmed === '') return fallback
  if (!isInAppPath(trimmed)) return fallback
  return trimmed
}

/** True when `raw` is a safe in-app path (no fallback applied). */
export function isSafeNextPath(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const trimmed = raw.trim()
  // Homepage is safe to *visit*, but not a meaningful post-auth `next` target.
  if (trimmed === '/') return false
  return isInAppPath(trimmed)
}

/** `/auth/signup` preserving a post-auth destination (`redirect` query). */
export function buildSignUpHref(nextPath?: string | null): string {
  if (isSafeNextPath(nextPath)) {
    return `/auth/signup?redirect=${encodeURIComponent(nextPath.trim())}`
  }
  return '/auth/signup'
}

/** Signup from a gated topic/lesson — carries return path and entry context. */
export function buildContentGateSignUpHref(returnPath: string): string {
  const params = new URLSearchParams({ from: 'content' })
  if (isSafeNextPath(returnPath)) {
    params.set('redirect', returnPath.trim())
  }
  return `/auth/signup?${params.toString()}`
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
 *
 * A teacher's home is their classrooms, not the student dashboard. Without this
 * a teacher who logged in landed on a revision homepage built for someone
 * sitting the exam, with no link anywhere to the classes they own.
 */
export function resolvePostAuthPath(
  onboarded: boolean,
  next: string | null | undefined,
  role?: 'student' | 'teacher' | null
): string {
  const home = role === 'teacher' ? '/teacher/dashboard' : '/dashboard'
  if (next && isSafeNextPath(next)) {
    const trimmed = next.trim()
    // Avoid /onboarding?next=/onboarding redirect loops after sign-in.
    if (trimmed === '/onboarding' || trimmed.startsWith('/onboarding?')) {
      return onboarded ? home : '/onboarding'
    }
    const authOnly = trimmed.startsWith('/auth/')
    if (onboarded || authOnly) return trimmed
    return `/onboarding?next=${encodeURIComponent(trimmed)}`
  }
  return onboarded ? home : '/onboarding'
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

/** Where to send the user after onboarding completes. Never loops back to onboarding or auth pages. */
export function postOnboardingHref(
  nextParam: string | null | undefined,
  fallback: string
): string {
  if (!nextParam) return fallback
  const trimmed = nextParam.trim()
  if (
    trimmed === '/onboarding' ||
    trimmed.startsWith('/onboarding?') ||
    trimmed.startsWith('/auth/')
  ) {
    return fallback
  }
  return sanitizeNextPath(nextParam, fallback)
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
