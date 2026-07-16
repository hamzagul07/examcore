/**
 * Drop near-duplicate ADJACENT answer pages before they are OCR-concatenated
 * and marked.
 *
 * Students sometimes photograph the same physical sheet twice (two shots of one
 * page, or an accidental double-select). Each image OCRs to near-identical text
 * — not byte-identical, because OCR is non-deterministic ("dictators" vs
 * "dictator's") — so exact-match dedup misses it. The duplicate then gets marked
 * a second time: wasted Gemini tokens and a real risk of the marker
 * double-crediting or getting confused by the repetition.
 *
 * We compare each page against the previous KEPT page by token-set OVERLAP
 * coefficient (|A∩B| / min(|A|,|B|)) and drop it when nearly all of one page's
 * words also appear in the other. Overlap beats Jaccard here: OCR variance
 * ("dictators" → "dictator" + "s", stray "is was") adds a handful of tokens
 * that pull Jaccard below a useful threshold (~0.87 on real duplicates) while
 * overlap stays high (~0.97). A length-ratio guard stops a short page that is
 * merely a token-subset of a long, genuinely different page from being dropped.
 * Only adjacent pages are compared. Pure and unit-tested.
 */

/** Overlap at/above which two adjacent pages are treated as the same sheet. */
const DUPLICATE_OVERLAP_THRESHOLD = 0.9
/** Pages must be within this length ratio (min/max tokens) to count as dupes. */
const MIN_LENGTH_RATIO = 0.6
/** Below this many tokens a page is too short to judge — never dropped. */
const MIN_TOKENS_TO_COMPARE = 12

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  )
}

/** Overlap coefficient: fraction of the SMALLER token set found in the other. */
function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection++
  return intersection / Math.min(a.size, b.size)
}

/**
 * Return `pages` with adjacent near-duplicates removed, preserving order and
 * keeping the FIRST occurrence. `onDrop` (if given) is called once per dropped
 * page with its original index and the similarity that triggered the drop —
 * callers use it to log what was collapsed.
 */
export function dropDuplicateAdjacentPages<T extends { full_text: string }>(
  pages: T[],
  onDrop?: (droppedIndex: number, similarity: number) => void
): T[] {
  if (pages.length < 2) return pages

  const kept: T[] = []
  let prevTokens: Set<string> | null = null

  pages.forEach((page, index) => {
    const tokens = tokenSet(page.full_text)
    if (
      prevTokens &&
      tokens.size >= MIN_TOKENS_TO_COMPARE &&
      prevTokens.size >= MIN_TOKENS_TO_COMPARE
    ) {
      const lengthRatio =
        Math.min(prevTokens.size, tokens.size) /
        Math.max(prevTokens.size, tokens.size)
      const similarity = overlapCoefficient(prevTokens, tokens)
      if (similarity >= DUPLICATE_OVERLAP_THRESHOLD && lengthRatio >= MIN_LENGTH_RATIO) {
        onDrop?.(index, similarity)
        // Keep prevTokens pointing at the last KEPT page so a run of 3+ near
        // -identical shots all collapse to one.
        return
      }
    }
    kept.push(page)
    prevTokens = tokens
  })

  return kept
}
