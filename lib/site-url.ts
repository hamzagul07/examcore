/**
 * Canonical public site origin for sitemap, OG, Stripe return URLs, and auth callbacks.
 *
 * Priority: NEXT_PUBLIC_SITE_URL → https://VERCEL_URL → production default.
 * On Vercel previews, set NEXT_PUBLIC_SITE_URL to the preview URL if you need
 * exact OG/auth alignment before markscheme.app DNS is live.
 *
 * Must include a scheme, e.g. https://markscheme.app (not bare markscheme.app).
 */

function normalizeOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/$/, '')
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export function resolveSiteUrl(): string {
  const explicit = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  if (explicit) return explicit

  const vercel = normalizeOrigin(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  )
  if (vercel) return vercel

  return 'https://markscheme.app'
}
