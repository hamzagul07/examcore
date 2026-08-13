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
const DONE_KEY = 'ms-finished-mark'

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

/**
 * A mark that finished while nobody was looking at the page it started on.
 *
 * Navigating away inside the app does NOT abort the marking request — the
 * browser keeps the connection open, so the server sees a perfectly healthy
 * client and never emails. The result therefore lands in a handler whose
 * component has been unmounted, where it would set state nobody is rendering
 * and then vanish. Writing it here is what turns that into something the
 * student can still be told about.
 */
export type FinishedMark = {
  markRunId: string
  attemptId: string | null
  marksEarned: number | null
  totalMarks: number | null
  ok: boolean
  finishedAt: number
}

/** Long enough to survive a page load, short enough not to resurface tomorrow. */
export const FINISHED_MARK_TTL_MS = 60 * 60_000

export function readFinishedMark(): FinishedMark | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DONE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FinishedMark
    if (!parsed?.markRunId) return null
    if (Date.now() - parsed.finishedAt > FINISHED_MARK_TTL_MS) {
      clearFinishedMark()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearFinishedMark(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DONE_KEY)
  } catch {
    /* nothing to do */
  }
}

/** Record a finished mark and wake any watcher. Clears the pending entry, since
 * the run it referred to is the one that just landed. */
export function noteFinishedMark(entry: Omit<FinishedMark, 'finishedAt'>): void {
  if (typeof window === 'undefined') return
  clearPendingMark()
  try {
    window.localStorage.setItem(
      DONE_KEY,
      JSON.stringify({ ...entry, finishedAt: Date.now() })
    )
  } catch {
    /* private mode / quota */
  }
  window.dispatchEvent(new Event(PENDING_MARK_EVENT))
}
