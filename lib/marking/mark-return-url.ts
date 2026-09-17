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
 * The roadmap's return path with the task the desk was opened for, so the
 * plan page can offer that task's check-in. Only the plan page reads `task`;
 * any other return path is left alone.
 */
export function withReturnTask(returnPath: string | null, taskId: string | null | undefined): string | null {
  if (!returnPath || !taskId || !returnPath.startsWith('/dashboard/plan')) return returnPath
  try {
    const url = new URL(returnPath, 'https://markscheme.app')
    url.searchParams.set('task', taskId)
    return `${url.pathname}${url.search}`
  } catch {
    return returnPath
  }
}

/**
 * Safe return from /mark. Allows lesson paths (`/courses/...`) and a small set of
 * dashboard desks so Vault / insights can deep-link students back after marking.
 */
export function parseMarkReturnPath(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
  try {
    const url = new URL(trimmed, 'https://markscheme.app')
    if (url.origin !== 'https://markscheme.app') return null
    const path = url.pathname
    const allowed =
      path.startsWith('/courses/') ||
      path === '/dashboard/vault' ||
      path === '/dashboard/plan' ||
      path.startsWith('/dashboard/progress')
    if (!allowed) return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}
