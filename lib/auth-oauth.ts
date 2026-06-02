import { isSafeNextPath } from '@/lib/auth-redirect'

/** Build `/auth/callback` URL for OAuth, magic links, and email confirmations. */
export function buildAuthCallbackUrl(
  origin: string,
  nextPath?: string | null
): string {
  const base = origin.replace(/\/$/, '')
  if (nextPath && isSafeNextPath(nextPath)) {
    return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`
  }
  return `${base}/auth/callback`
}
