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

export function parseMarkReturnPath(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const path = raw.trim()
  if (!path.startsWith('/courses/')) return null
  return path
}
