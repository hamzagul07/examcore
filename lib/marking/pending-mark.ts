/**
 * The mark you walked away from, remembered across pages.
 *
 * Marking honestly costs minutes, and the run now survives the page being
 * closed. What was still missing is the in-app half: a student who submits and
 * then goes to read a lesson had no way of learning the mark had landed, short
 * of navigating back to /mark and hoping, or waiting for the email.
 *
 * Deliberately localStorage and not React state — the whole point is that it
 * outlives the component, the route, and the tab.
 */

const KEY = 'ms-pending-mark'

export type PendingMark = {
  markRunId: string
  /** Epoch ms, so a run that never settles can be given up on. */
  startedAt: number
  /** Shown in the banner when we have it; purely cosmetic. */
  subjectLabel?: string | null
}

/**
 * How long to keep watching. Matches MARK_RUN_STALE_MINUTES, the age at which
 * the sweep gives a run up for dead — past that there is nothing left to wait
 * for, and the sweep will have emailed instead.
 */
export const PENDING_MARK_TTL_MS = 20 * 60_000

export function readPendingMark(): PendingMark | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingMark
    if (!parsed?.markRunId || typeof parsed.startedAt !== 'number') return null
    // Expired entries are cleared rather than returned, so a stale run cannot
    // leave a banner promising a result that is never coming.
    if (Date.now() - parsed.startedAt > PENDING_MARK_TTL_MS) {
      clearPendingMark()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writePendingMark(entry: PendingMark): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entry))
  } catch {
    /* private mode / quota — the email path still covers this student */
  }
}

export function clearPendingMark(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}

/** Broadcast so a watcher already mounted picks the run up without a reload. */
export const PENDING_MARK_EVENT = 'ms:pending-mark'

export function notePendingMark(entry: PendingMark): void {
  writePendingMark(entry)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PENDING_MARK_EVENT))
  }
}
