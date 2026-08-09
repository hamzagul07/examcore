/** Append a return path so /mark can link back to the originating lesson. */
export function appendMarkReturnUrl(href: string, returnPath: string): string {
  if (!returnPath.startsWith('/')) return href
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://markscheme.app'
    const url = new URL(href, base)
    url.searchParams.set('return', returnPath)
    return `${url.pathname}${url.search}`
  } catch {
    const join = href.includes('?') ? '&' : '?'
    return `${href}${join}return=${encodeURIComponent(returnPath)}`
  }
}

/**
 * Safe lesson return from /mark. Allows `/courses/...` plus an optional query
 * (e.g. `?board=edexcel&unit=WMA11` so the Edexcel study bridge survives).
 */
export function parseMarkReturnPath(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  try {
    const url = new URL(trimmed, 'https://markscheme.app')
    if (url.origin !== 'https://markscheme.app') return null
    if (!url.pathname.startsWith('/courses/')) return null
    // Drop hash — return should land on the lesson with board context, not mid-section.
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}
