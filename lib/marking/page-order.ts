/**
 * Read a multi-page answer in the order it was written, not the order it was
 * photographed.
 *
 * `[Page N]` has always been the upload array index — whatever order the files
 * arrived in is the order the examiner reads. On 2026-09-14 a student
 * photographed the second sheet of an IB French B diary entry first, so the
 * marker received a text that opens mid-argument with "Mais car je ne suis pas
 * en forme", delivers its conclusion inside eighty words, and only then says
 * "Cher Journal, Récemment je me suis rendu compte…". It scored 1/12. The same
 * work, pages the right way round, scored 8/12.
 *
 * The uploader has always offered drag-to-reorder. That is not the gap — a
 * student who photographs two sheets in the wrong order does not know they did.
 * Nothing checked, so nothing told them.
 *
 * Why a model call rather than a heuristic: the signal is linguistic, and this
 * product marks in French, Spanish, German, Mandarin and English. "Starts with a
 * lowercase conjunction" and "contains a salutation" are English-shaped rules
 * that would have to be rewritten per language and would still miss the
 * continuation cases. The model has already read every page; asking it which
 * order they go in costs one small call on the ~15 multi-page runs a month.
 *
 * Everything here is pure. The call itself lives in the pipeline so this stays
 * testable, and every failure mode — bad JSON, a short response, a permutation
 * that is not a permutation — falls back to the uploaded order, because a
 * confident wrong reordering is worse than the status quo it replaces.
 */

/**
 * Pages shorter than this carry no continuity signal worth judging — a cover
 * sheet or a page holding a single diagram would have the model guessing.
 */
export const MIN_PAGE_CHARS_FOR_ORDERING = 120

/** Head and tail sent per page: continuity lives at the seams, not the middle. */
const HEAD_CHARS = 400
const TAIL_CHARS = 220

export function shouldCheckPageOrder(pageTexts: string[]): boolean {
  if (pageTexts.length < 2) return false
  // Every page has to be substantial. One thin page among several makes the
  // ordering unjudgeable and is the shape most likely to produce a bad guess.
  return pageTexts.every(
    (t) => (t ?? '').trim().length >= MIN_PAGE_CHARS_FOR_ORDERING
  )
}

/** A page reduced to its seams, which is all the ordering question needs. */
export function pageExcerpt(text: string): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= HEAD_CHARS + TAIL_CHARS + 20) return t
  return `${t.slice(0, HEAD_CHARS)} […] ${t.slice(-TAIL_CHARS)}`
}

export function buildPageOrderPrompt(pageTexts: string[]): string {
  const blocks = pageTexts
    .map((t, i) => `--- PAGE ${i + 1} ---\n${pageExcerpt(t)}`)
    .join('\n\n')

  return `A student photographed the pages of one handwritten answer. They may be in the wrong order.

Work out the order a reader should read them in, using continuity only: which page opens the piece (a salutation, title, date, introduction), which continues a sentence or argument begun on another, and which closes it.

${blocks}

Reply with ONLY a JSON array of the page numbers in reading order, e.g. [2,1,3].
It must contain every page number from 1 to ${pageTexts.length} exactly once.
If the pages are already in the right order, reply [${pageTexts.map((_, i) => i + 1).join(',')}].
No prose, no code fence.`
}

/**
 * Parse a claimed order, returning it only if it is a genuine permutation of
 * 1..pageCount.
 *
 * Strict on purpose. A response that drops a page, repeats one or invents an
 * index would silently delete or duplicate a student's work — so anything that
 * is not exactly a permutation is discarded and the upload order stands.
 */
export function parsePageOrder(
  raw: string,
  pageCount: number
): number[] | null {
  if (!raw || pageCount < 1) return null

  // Tolerate a code fence or stray prose around the array; take the first
  // bracketed group only.
  const match = raw.match(/\[[^\]]*\]/)
  if (!match) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length !== pageCount) return null

  const order: number[] = []
  const seen = new Set<number>()
  for (const entry of parsed) {
    const n = typeof entry === 'number' ? entry : Number(entry)
    if (!Number.isInteger(n) || n < 1 || n > pageCount) return null
    if (seen.has(n)) return null
    seen.add(n)
    order.push(n)
  }
  return order.length === pageCount ? order : null
}

/** True when the order leaves the pages exactly as uploaded. */
export function isUploadOrder(order: number[]): boolean {
  return order.every((n, i) => n === i + 1)
}

/** Apply a 1-based reading order to anything held one-per-page. */
export function applyPageOrder<T>(pages: T[], order: number[]): T[] {
  return order.map((n) => pages[n - 1]!)
}

/**
 * How the reorder reads to a human, for the log line and for telling the
 * student what we did: "2 → 1" rather than a bare array.
 */
export function describePageOrder(order: number[]): string {
  return order.join(' → ')
}
