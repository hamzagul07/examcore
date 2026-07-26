/**
 * What to say to someone who has been here before.
 *
 * A returning student currently arrives at the top of a lesson with no
 * acknowledgement that they ever read it, and has to remember for themselves
 * where they stopped. The progress is already tracked per section — this turns
 * it into the one sentence worth showing on arrival.
 *
 * Pure, so the "should we say anything at all" rules are testable.
 */

export type TocEntry = { id: string; label: string }

export type Resume =
  | { kind: 'none' }
  /** Partway through: point at the first section not yet done. */
  | { kind: 'continue'; done: number; total: number; nextId: string; nextLabel: string }
  /** Everything read, but the checking step is outstanding. */
  | { kind: 'check'; total: number; checkId: string }
  /** Nothing left to do here. */
  | { kind: 'complete'; total: number }

/**
 * Deliberately silent on a first visit and on a near-first one.
 *
 * Telling somebody "1 of 12 done" the moment they glance at a page is noise
 * dressed as encouragement; there is nothing to resume yet. Two sections is the
 * point where they plausibly left and came back.
 */
export const MIN_SECTIONS_TO_RESUME = 2

export function resumeState(
  toc: readonly TocEntry[],
  readIds: ReadonlySet<string>,
  opts: { checkId?: string; checkDone?: boolean } = {}
): Resume {
  const total = toc.length
  if (!total) return { kind: 'none' }

  const done = toc.filter((t) => readIds.has(t.id)).length
  if (done < MIN_SECTIONS_TO_RESUME) return { kind: 'none' }

  const next = toc.find((t) => !readIds.has(t.id))
  if (next) {
    return { kind: 'continue', done, total, nextId: next.id, nextLabel: next.label }
  }

  // Read everything. If there is a quick check they never finished, that is the
  // most useful thing to point at — rereading is the weakest way to revise.
  if (opts.checkId && opts.checkDone === false) {
    return { kind: 'check', total, checkId: opts.checkId }
  }
  return { kind: 'complete', total }
}

/** Human summary for the strip. */
export function resumeMessage(state: Resume): { title: string; body: string } | null {
  switch (state.kind) {
    case 'continue':
      return {
        title: 'Welcome back',
        body: `You worked through ${state.done} of ${state.total} sections. Pick up at ${state.nextLabel}.`,
      }
    case 'check':
      return {
        title: 'You have read all of this',
        body: 'Rereading is the weakest way to revise. Try the quick check — writing it down is what makes it stick.',
      }
    case 'complete':
      return {
        title: 'You have been through this one',
        body: 'Nothing left here. The fastest way to find out if it stuck is a real question, marked.',
      }
    default:
      return null
  }
}
