/**
 * Honest lesson progress.
 *
 * The lesson page reported progress as scroll position. That is not progress:
 * flick to the bottom and it says 99%; read the first three sections carefully
 * and it says 15%. It was also the most prominent motivational element on the
 * page, so the number a student was being encouraged by was the one number that
 * had nothing to do with whether they had learned anything.
 *
 * This counts sections actually worked through. A section is "read" once the
 * student has dwelled on it long enough to plausibly have read it, and sections
 * with something to do (the quick check) are marked done by the interaction
 * itself rather than by time.
 *
 * Pure so the dwell accounting and the thresholds are testable without a DOM.
 */

/** Minimum dwell for the shortest section — below this nobody read anything. */
export const MIN_DWELL_MS = 1200
/** Cap, so a very long section cannot become unreachable. */
export const MAX_DWELL_MS = 6000
/**
 * Roughly 200 words per minute over a ~90-character line. Deliberately
 * generous: the goal is to exclude scrolling past, not to police reading speed.
 */
const MS_PER_PIXEL = 3.2

/**
 * How long a section must hold attention before it counts as read.
 * Scales with its height, so a one-line callout is not worth the same as three
 * screens of notes.
 */
export function dwellTargetFor(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return MIN_DWELL_MS
  const scaled = heightPx * MS_PER_PIXEL
  return Math.round(Math.min(MAX_DWELL_MS, Math.max(MIN_DWELL_MS, scaled)))
}

export type SectionState = {
  id: string
  /** Milliseconds this section has held the reader's attention. */
  dwellMs: number
  /** Height when last measured, for the dwell target. */
  heightPx: number
  /** Completed by doing something, not by looking — always counts. */
  interacted?: boolean
}

export function isSectionRead(s: SectionState): boolean {
  if (s.interacted) return true
  return s.dwellMs >= dwellTargetFor(s.heightPx)
}

/**
 * Whole-lesson percentage.
 *
 * Rounds DOWN except at a genuine 100%, so it never claims a section you have
 * not finished. Reports 0 rather than NaN for a lesson with no sections.
 */
export function progressPercent(states: SectionState[]): number {
  if (!states.length) return 0
  const done = states.filter(isSectionRead).length
  if (done === states.length) return 100
  return Math.floor((done / states.length) * 100)
}

export function readSectionIds(states: SectionState[]): string[] {
  return states.filter(isSectionRead).map((s) => s.id)
}

/** Persisted shape — only what is needed to restore, keyed by section id. */
export type StoredProgress = Record<string, { d: number; i?: 1 }>

export function toStored(states: SectionState[]): StoredProgress {
  const out: StoredProgress = {}
  for (const s of states) {
    // Cap what is written so a stored value cannot mark a future, longer
    // version of the section as read before it has been looked at.
    out[s.id] = { d: Math.min(s.dwellMs, MAX_DWELL_MS), ...(s.interacted ? { i: 1 as const } : {}) }
  }
  return out
}

export function fromStored(
  stored: StoredProgress | null | undefined,
  ids: string[],
  heights: Record<string, number>
): SectionState[] {
  return ids.map((id) => ({
    id,
    dwellMs: Math.max(0, stored?.[id]?.d ?? 0),
    heightPx: heights[id] ?? 0,
    interacted: stored?.[id]?.i === 1,
  }))
}
