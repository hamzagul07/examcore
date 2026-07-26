/**
 * Student highlights over lesson prose.
 *
 * Marking up a text is the oldest study technique there is and the lesson had
 * no way to do it — the page was something you read, never something you
 * annotated. Highlights turn it into a document that remembers what mattered to
 * you, which is also the only revision artifact on the page that is genuinely
 * personal.
 *
 * The colours mean things rather than just being colours. That is what makes
 * the end-of-lesson recap worth reading: "the four things I did not follow" is
 * useful, "the four yellow bits" is not. It also feeds the explain feature —
 * anything marked as not understood can offer to explain itself.
 *
 * Everything here is pure. The offset arithmetic is the part that silently
 * corrupts if it is wrong, so it is kept away from the DOM and tested directly.
 */

export type HighlightKind = 'key' | 'unclear' | 'exam'

export const HIGHLIGHT_KINDS: readonly HighlightKind[] = ['key', 'unclear', 'exam']

export const HIGHLIGHT_META: Record<
  HighlightKind,
  { label: string; hint: string; recapTitle: string }
> = {
  key: {
    label: 'Key point',
    hint: 'Worth remembering',
    recapTitle: 'The points you marked as key',
  },
  unclear: {
    label: "Don't get it",
    hint: 'Come back to this',
    recapTitle: 'What you did not follow',
  },
  exam: {
    label: 'Exam-worthy',
    hint: 'Likely to be asked',
    recapTitle: 'What you flagged as exam-worthy',
  },
}

export type Highlight = {
  id: string
  /** Section the range lives in — highlights never span sections. */
  section: string
  /** Character offsets into the section's highlightable text. */
  start: number
  end: number
  kind: HighlightKind
  /** The highlighted words, kept so the recap can show them without the DOM. */
  text: string
}

export const STORE_VERSION = 1

export function storageKey(lessonSlug: string): string {
  return `ms:highlights:${lessonSlug}`
}

/**
 * Ranges are normalised on the way in: start before end, never empty.
 *
 * A backwards selection is completely normal — dragging right to left produces
 * one — and storing it unnormalised would mean it silently never renders.
 */
export function normalise(start: number, end: number): { start: number; end: number } | null {
  const s = Math.max(0, Math.min(start, end))
  const e = Math.max(0, Math.max(start, end))
  if (e <= s) return null
  return { start: s, end: e }
}

/**
 * Add a highlight, absorbing anything it touches of the same kind.
 *
 * Without merging, dragging over the same sentence twice leaves two overlapping
 * marks, and removing one leaves a ragged half-highlight behind. Different
 * kinds are left alone — marking part of a "key point" as "don't get it" is a
 * deliberate act, not an accident, and the later mark wins on the overlap.
 */
export function addHighlight(
  existing: readonly Highlight[],
  next: Omit<Highlight, 'id'>,
  id: string
): Highlight[] {
  const range = normalise(next.start, next.end)
  if (!range) return [...existing]

  let start = range.start
  let end = range.end
  const out: Highlight[] = []

  for (const h of existing) {
    if (h.section !== next.section) {
      out.push(h)
      continue
    }
    if (h.kind === next.kind) {
      // Touching counts as overlapping: two adjacent marks of the same kind
      // read as one and should behave as one.
      if (h.start <= end && h.end >= start) {
        start = Math.min(start, h.start)
        end = Math.max(end, h.end)
        continue
      }
      out.push(h)
      continue
    }
    // A different kind gives way over the overlap only.
    out.push(...subtract(h, start, end))
  }

  out.push({ ...next, id, start, end })
  return sortHighlights(out)
}

/** What is left of a highlight once a range is cut out of it. */
function subtract(h: Highlight, start: number, end: number): Highlight[] {
  if (h.end <= start || h.start >= end) return [h]
  const parts: Highlight[] = []
  if (h.start < start) {
    parts.push({ ...h, id: `${h.id}a`, end: start, text: h.text.slice(0, start - h.start) })
  }
  if (h.end > end) {
    parts.push({
      ...h,
      id: `${h.id}b`,
      start: end,
      text: h.text.slice(Math.max(0, end - h.start)),
    })
  }
  return parts
}

export function removeHighlight(existing: readonly Highlight[], id: string): Highlight[] {
  return existing.filter((h) => h.id !== id)
}

/** Any highlight covering this offset, most recently added first. */
export function highlightAt(
  existing: readonly Highlight[],
  section: string,
  offset: number
): Highlight | null {
  for (let i = existing.length - 1; i >= 0; i--) {
    const h = existing[i]!
    if (h.section === section && offset >= h.start && offset < h.end) return h
  }
  return null
}

export function sortHighlights(list: readonly Highlight[]): Highlight[] {
  return [...list].sort((a, b) =>
    a.section === b.section ? a.start - b.start : a.section.localeCompare(b.section)
  )
}

/** Highlights of one kind, in reading order. */
export function byKind(list: readonly Highlight[], kind: HighlightKind): Highlight[] {
  return sortHighlights(list.filter((h) => h.kind === kind))
}

/** Kinds actually used, in the canonical order. */
export function kindsPresent(list: readonly Highlight[]): HighlightKind[] {
  return HIGHLIGHT_KINDS.filter((k) => list.some((h) => h.kind === k))
}

export function serialize(list: readonly Highlight[]): string {
  return JSON.stringify({ v: STORE_VERSION, items: sortHighlights(list) })
}

/**
 * Tolerant of anything: corrupt storage must lose highlights, never break the
 * lesson. Rows that do not describe a usable range are dropped individually
 * rather than failing the whole set.
 */
export function parse(raw: string | null | undefined): Highlight[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!data || typeof data !== 'object') return []
  const items = (data as { items?: unknown }).items
  if (!Array.isArray(items)) return []

  const out: Highlight[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const h = item as Partial<Highlight>
    if (typeof h.section !== 'string' || !h.section) continue
    if (typeof h.start !== 'number' || typeof h.end !== 'number') continue
    if (!Number.isFinite(h.start) || !Number.isFinite(h.end)) continue
    const range = normalise(h.start, h.end)
    if (!range) continue
    const kind = HIGHLIGHT_KINDS.includes(h.kind as HighlightKind)
      ? (h.kind as HighlightKind)
      : 'key'
    out.push({
      id: typeof h.id === 'string' && h.id ? h.id : `${h.section}-${range.start}-${range.end}`,
      section: h.section,
      start: range.start,
      end: range.end,
      kind,
      text: typeof h.text === 'string' ? h.text : '',
    })
  }
  return sortHighlights(out)
}

/**
 * Split a section's highlights into rendering pieces.
 *
 * Returned as [start, end, kind|null] spans covering 0..length with no gaps and
 * no overlaps, so the renderer never has to reason about intersections — it
 * walks text nodes once and wraps what it is told to.
 */
export function spansFor(
  list: readonly Highlight[],
  section: string,
  length: number
): Array<{ start: number; end: number; kind: HighlightKind | null; id: string | null }> {
  const here = sortHighlights(list.filter((h) => h.section === section))
  const out: Array<{ start: number; end: number; kind: HighlightKind | null; id: string | null }> =
    []
  let at = 0
  for (const h of here) {
    const s = Math.min(h.start, length)
    const e = Math.min(h.end, length)
    if (e <= at) continue
    if (s > at) out.push({ start: at, end: s, kind: null, id: null })
    out.push({ start: Math.max(s, at), end: e, kind: h.kind, id: h.id })
    at = e
  }
  if (at < length) out.push({ start: at, end: length, kind: null, id: null })
  return out
}
