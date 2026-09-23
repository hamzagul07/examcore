/**
 * Pre-hydration hint: which profile board /mark should lock to.
 *
 * /mark is a static page, so its first paint cannot know who is signed in and
 * would show the six-board grid to a student who chose a board in onboarding —
 * then collapse it a second or two later once the profile loads. To avoid that
 * flash we cache the profile board id here whenever a profile loads or a board
 * is saved, and a boot snippet in the root layout stamps
 * `<html data-ms-board-lock>` before first paint so the grid is hidden until
 * React renders the real locked line.
 *
 * The profile load still owns the truth: a guest clears the hint, a changed
 * board rewrites it, and the lock resolver validates the value against the
 * exam-system registry, so a stale or garbage value can only ever cost one
 * short placeholder — never a wrong board on a mark.
 */
export const MARK_BOARD_HINT_KEY = 'ms-profile-board'
export const MARK_BOARD_HINT_ATTR = 'data-ms-board-lock'
const CHANGE_EVENT = 'ms-profile-board-change'

/** Inline in <head>, next to EC_THEME_BOOT_SCRIPT. Tiny and fail-silent. */
export const MARK_BOARD_HINT_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem('${MARK_BOARD_HINT_KEY}')){document.documentElement.setAttribute('${MARK_BOARD_HINT_ATTR}','1');}}catch(e){}})();`

export function readMarkBoardHint(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(MARK_BOARD_HINT_KEY)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

/** Cache the profile board; a blank value clears the hint instead. */
export function writeMarkBoardHint(profileBoard: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const value = profileBoard?.trim()
  if (!value) {
    clearMarkBoardHint()
    return
  }
  try {
    if (window.localStorage.getItem(MARK_BOARD_HINT_KEY) !== value) {
      window.localStorage.setItem(MARK_BOARD_HINT_KEY, value)
    }
  } catch {
    /* private mode / quota — the attribute below still covers this page view */
  }
  document.documentElement.setAttribute(MARK_BOARD_HINT_ATTR, '1')
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearMarkBoardHint(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(MARK_BOARD_HINT_KEY)
  } catch {
    /* ignore */
  }
  document.documentElement.removeAttribute(MARK_BOARD_HINT_ATTR)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Lift the pre-paint attribute without forgetting the cached board. The grid
 * calls this once the profile has loaded and it is the thing being shown —
 * the backstop that guarantees a stale or unlockable hint can never leave a
 * student staring at the placeholder with no way to mark.
 */
export function releaseMarkBoardBoot(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute(MARK_BOARD_HINT_ATTR)
}

/** For useSyncExternalStore: same-tab writes plus cross-tab storage events. */
export function subscribeMarkBoardHint(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}
