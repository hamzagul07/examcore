/**
 * Canonical public site origin for sitemap, OG, Stripe return URLs, and auth callbacks.
 *
 * Priority: NEXT_PUBLIC_SITE_URL → https://VERCEL_URL → production default.
 * On Vercel previews, set NEXT_PUBLIC_SITE_URL to the preview URL if you need
 * exact OG/auth alignment before markscheme.app DNS is live.
 */
export function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit

  const vercelHost = process.env.VERCEL_URL?.trim().replace(/\/$/, '')
  if (vercelHost) return `https://${vercelHost}`

  return 'https://markscheme.app'
}
