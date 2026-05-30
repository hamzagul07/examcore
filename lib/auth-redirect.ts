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
