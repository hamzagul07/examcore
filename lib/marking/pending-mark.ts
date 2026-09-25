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
 *
 * Every record names its OWNER. localStorage is per browser, not per account:
 * on a shared school machine the next student to sign in saw "Your mark is
 * ready — 7/10" with a link to the previous student's attempt (code review
 * 2026-09-25, §2 Frontend). The watcher now ignores anything not written by
 * the current session's user, and both keys are cleared whenever the user
 * changes.
 */

const KEY = 'ms-pending-mark'
const DONE_KEY = 'ms-finished-mark'

/** The owner recorded for a run started without a signed-in user. */
export const GUEST_MARK_OWNER = 'guest'

export type MarkOwner = string

/** The owner key for a session: the user id, or 'guest'. */
export function markOwnerFor(userId: string | null | undefined): MarkOwner {
  return userId && userId.trim() ? userId : GUEST_MARK_OWNER
}

/**
 * Whether a record may be shown to the current session. A record with no
 * owner predates this field; it is treated as nobody's, since the whole
 * point is never to show one student another's mark.
 */
export function isMarkRecordOwnedBy(
  record: { owner?: MarkOwner | null } | null | undefined,
  owner: MarkOwner
): boolean {
  return !!record && typeof record.owner === 'string' && record.owner === owner
}

export type PendingMark = {
  markRunId: string
  /** Epoch ms, so a run that never settles can be given up on. */
  startedAt: number
  /** Who started it; compared against the session before anything is shown. */
  owner: MarkOwner
  /** Shown in the banner when we have it; purely cosmetic. */
  subjectLabel?: string | null
}

/**
 * How long to keep watching. Matches MARK_RUN_STALE_MINUTES, the age at which
 * the sweep gives a run up for dead — past that there is nothing left to wait
 * for, and the sweep will have emailed instead.
 */
export const PENDING_MARK_TTL_MS = 20 * 60_000

/** Pure: a stored pending record, or null when unusable or expired. */
export function parsePendingMark(raw: string | null, now: number): PendingMark | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PendingMark>
    if (!parsed?.markRunId || typeof parsed.startedAt !== 'number') return null
    if (now - parsed.startedAt > PENDING_MARK_TTL_MS) return null
    return {
      markRunId: parsed.markRunId,
      startedAt: parsed.startedAt,
      owner: typeof parsed.owner === 'string' ? parsed.owner : '',
      subjectLabel: parsed.subjectLabel ?? null,
    }
  } catch {
    return null
  }
}

export function readPendingMark(): PendingMark | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed = parsePendingMark(window.localStorage.getItem(KEY), Date.now())
    // Expired or unreadable entries are cleared rather than returned, so a
    // stale run cannot leave a banner promising a result that is never coming.
    if (!parsed && window.localStorage.getItem(KEY) !== null) clearPendingMark()
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
  owner: MarkOwner
}

/** Long enough to survive a page load, short enough not to resurface tomorrow. */
export const FINISHED_MARK_TTL_MS = 60 * 60_000

/** Pure: a stored finished record, or null when unusable or expired. */
export function parseFinishedMark(raw: string | null, now: number): FinishedMark | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FinishedMark>
    if (!parsed?.markRunId || typeof parsed.finishedAt !== 'number') return null
    if (now - parsed.finishedAt > FINISHED_MARK_TTL_MS) return null
    return {
      markRunId: parsed.markRunId,
      attemptId: parsed.attemptId ?? null,
      marksEarned: parsed.marksEarned ?? null,
      totalMarks: parsed.totalMarks ?? null,
      ok: parsed.ok === true,
      finishedAt: parsed.finishedAt,
      owner: typeof parsed.owner === 'string' ? parsed.owner : '',
    }
  } catch {
    return null
  }
}

export function readFinishedMark(): FinishedMark | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed = parseFinishedMark(window.localStorage.getItem(DONE_KEY), Date.now())
    if (!parsed && window.localStorage.getItem(DONE_KEY) !== null) clearFinishedMark()
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

/** Both keys at once — what a change of user calls for. */
export function clearAllMarkRecords(): void {
  clearPendingMark()
  clearFinishedMark()
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
