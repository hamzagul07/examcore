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
