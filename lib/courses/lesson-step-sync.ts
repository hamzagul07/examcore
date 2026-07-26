/**
 * Maps "which note block is the reader looking at" to "which diagram step
 * should be showing".
 *
 * The positional block→step correspondence is not invented here — it is the
 * relation the content pipeline already asserts in two places:
 *
 *  - `simplerByHeading` in lib/courses/margin-notes/adapt-lesson.ts pairs note
 *    block i with `simpleExplanation.steps[i]`.
 *  - `alignDiagramSpecToSteps` in lib/courses/attach-lesson-visuals.ts pads or
 *    truncates a diagram spec's steps so their count matches the lesson's, so
 *    diagram beat i and explanation step i describe the same moment.
 *
 * Split out from the component so the mapping is unit-testable without a DOM.
 */

/**
 * Blocks beyond the last step hold on the final step rather than wrapping or
 * clearing. Matches `simplerByHeading`, which simply leaves trailing blocks
 * unpaired instead of cycling back to the start.
 */
export function stepForBlockIndex(blockIndex: number, stepCount: number): number {
  if (stepCount <= 0) return 1
  const oneBased = blockIndex + 1
  return Math.min(Math.max(oneBased, 1), stepCount)
}

export type BlockVisibility = {
  index: number
  /** Fraction of the block inside the viewport, 0–1. */
  ratio: number
  /** Distance from the top of the viewport to the block's top, in px. */
  top: number
}

/**
 * Picks the block the reader is actually on from everything currently
 * intersecting.
 *
 * Most-visible wins, because that is what "reading" means when two blocks share
 * the viewport. Ties break toward the higher block (smaller `top`): while
 * scrolling down past a boundary the outgoing and incoming blocks briefly hold
 * equal ratios, and preferring the incoming one there makes the diagram jump a
 * step early, ahead of the prose.
 *
 * Returns null when nothing is visible, which the caller should treat as "leave
 * the step alone" rather than "reset".
 */
export function activeBlockIndex(visible: BlockVisibility[]): number | null {
  let best: BlockVisibility | null = null
  for (const candidate of visible) {
    if (candidate.ratio <= 0) continue
    if (
      !best ||
      candidate.ratio > best.ratio ||
      (candidate.ratio === best.ratio && candidate.top < best.top)
    ) {
      best = candidate
    }
  }
  return best ? best.index : null
}
