/**
 * One-time feature hints.
 *
 * The lesson gained several things a reader cannot guess at — per-paragraph
 * explanations, a diagram that follows the prose, a quick check that wants an
 * answer before it shows one. A feature nobody knows about is the same as one
 * that was never built, and the explain buttons in particular were deliberately
 * styled to sit quietly, which turned out to mean invisible.
 *
 * The rules these hints follow, and why:
 *   - shown once, ever, per feature — a hint that repeats is an advert
 *   - dismissed the moment the feature is used, because it has done its job
 *   - never more than one on screen, so the page is never a tutorial
 *
 * Pure, so the seen/unseen accounting is testable without a DOM.
 */

export const HINT_KEYS = {
  explain: 'explain-block',
  studyMode: 'study-mode',
  highlight: 'highlight',
  diagramSync: 'diagram-sync',
  quickCheck: 'quick-check',
} as const

export type HintKey = (typeof HINT_KEYS)[keyof typeof HINT_KEYS]

const STORAGE_KEY = 'ms:hints:seen'

export function parseSeen(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set()
  } catch {
    // Corrupt storage must not mean every hint fires forever.
    return new Set()
  }
}

export function serializeSeen(seen: ReadonlySet<string>): string {
  return JSON.stringify([...seen])
}

export function hasSeen(seen: ReadonlySet<string>, key: HintKey): boolean {
  return seen.has(key)
}

/**
 * Which hint to show, given what has been seen and what is on the page.
 *
 * Returns at most one. Order is deliberate: explain first because it is the one
 * a stuck reader needs, and a stuck reader is the person a hint can actually
 * help. Study mode second because it is the only one that changes how the whole
 * page works, and finding that out on your fourth visit is finding it out too
 * late. The rest wait for another visit.
 */
export function nextHint(
  seen: ReadonlySet<string>,
  available: readonly HintKey[]
): HintKey | null {
  for (const key of available) {
    if (!seen.has(key)) return key
  }
  return null
}

export const STORAGE = STORAGE_KEY
