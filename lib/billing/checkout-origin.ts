/**
 * Where a checkout's success URL may point, and which callers may start one.
 *
 * The success URL used to be built from the request's `Origin` header. That
 * header is whatever the caller sends: a checkout started from another origin
 * (or with a forged header) would have had Polar return the customer — session
 * cookies and all — to that origin's `/account?checkout=success`. The site
 * origin is now taken from configuration (`resolveSiteUrl`) and is the ONLY
 * thing the success URL is built from; the `Origin` header, when present,
 * must be one of the origins this deployment is actually served on.
 *
 * "Actually served on" is a list, not the one configured value. Accepting
 * only `resolveSiteUrl()` refused every Vercel preview (NEXT_PUBLIC_SITE_URL
 * set to production while the tester is on the deployment or branch alias),
 * and would refuse a www/apex twin in production — 403 'Bad origin' on the
 * upgrade button, on hosts the old code accepted. The allowlist is the site
 * origin plus the request's own origin (the browser sets the Host header to
 * the target it is posting to, so Origin == request origin is the plain
 * same-origin test) plus the Vercel deployment and branch URLs.
 *
 * Absent `Origin` is allowed: same-origin fetches from older browsers and the
 * mobile app (bearer auth, no browser origin) send none, and SameSite=Lax
 * cookies already stop a cross-site POST from carrying the session. The check
 * is defence in depth against a mismatched deployment, not the CSRF gate.
 *
 * Outside production, `localhost` / `127.0.0.1` origins are accepted on any
 * port so local dev against a configured NEXT_PUBLIC_SITE_URL still works.
 */
export function checkoutOriginAllowed(
  origin: string | null | undefined,
  siteUrl: string | readonly string[],
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (!origin) return true
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }
  const allowed = typeof siteUrl === 'string' ? [siteUrl] : siteUrl
  for (const candidate of allowed) {
    if (!candidate) continue
    // Compared as ORIGINS, so `https://host/` and `https://host` agree and a
    // candidate with a path cannot widen the match.
    try {
      if (new URL(candidate).origin === parsed.origin) return true
    } catch {
      /* not a URL — skip */
    }
  }
  if (nodeEnv !== 'production') {
    const host = parsed.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true
  }
  return false
}

/**
 * The origins a browser may legitimately POST /api/billing/checkout from on
 * this deployment: the configured site origin, the origin the request itself
 * arrived on, and Vercel's own URLs for this deployment. Empty and malformed
 * entries are dropped, so a missing env var never widens or breaks the list.
 */
export function checkoutAllowedOrigins(opts: {
  siteUrl: string
  requestOrigin?: string | null
  vercelUrl?: string | null
  vercelBranchUrl?: string | null
}): string[] {
  const raw = [
    opts.siteUrl,
    opts.requestOrigin,
    opts.vercelUrl ? `https://${opts.vercelUrl}` : null,
    opts.vercelBranchUrl ? `https://${opts.vercelBranchUrl}` : null,
  ]
  const origins: string[] = []
  for (const value of raw) {
    if (!value) continue
    try {
      const origin = new URL(value).origin
      if (!origins.includes(origin)) origins.push(origin)
    } catch {
      /* skip */
    }
  }
  return origins
}
