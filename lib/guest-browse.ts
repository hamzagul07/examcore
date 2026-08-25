/** Session cookie — guests who skip signup can browse gated topic pages for this visit. */
export const GUEST_BROWSE_COOKIE = 'ms_guest_browse'

export function isGuestBrowseEnabled(cookieValue: string | undefined | null): boolean {
  return cookieValue === '1'
}

/** Client-only — sets a session cookie (no Max-Age). */
export function setGuestBrowseCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${GUEST_BROWSE_COOKIE}=1; path=/; SameSite=Lax`
}

/** Client-only — true when this visit chose "browse without an account". */
export function hasGuestBrowseCookie(): boolean {
  if (typeof document === 'undefined') return false
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${GUEST_BROWSE_COOKIE}=`))
  return isGuestBrowseEnabled(entry?.split('=')[1])
}

/**
 * UA sniff for major search/AI crawlers. Lives here (not in a server component)
 * so the client-side save prompt can use it too: most crawlers never execute
 * JS, but Googlebot renders pages, and it should not be shown a signup nudge
 * that no cached snapshot could ever include.
 */
export function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot/i.test(
    userAgent
  )
}
