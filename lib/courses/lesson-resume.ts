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
  /** Everything read up to a retrieval step — push produce, not reread. */
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

/** Retrieval surfaces — produce answers, don't reread. */
export const RETRIEVAL_SECTION_IDS = ['quiz', 'teachback', 'cards'] as const

export function resumeState(
  toc: readonly TocEntry[],
  readIds: ReadonlySet<string>,
  opts: {
    /** @deprecated prefer retrievalIds */
    checkId?: string
    checkDone?: boolean
    /** Preferred unfinished retrieval steps, in priority order. */
    retrievalIds?: string[]
  } = {}
): Resume {
  const total = toc.length
  if (!total) return { kind: 'none' }

  const done = toc.filter((t) => readIds.has(t.id)).length
  if (done < MIN_SECTIONS_TO_RESUME) return { kind: 'none' }

  const retrieval =
    opts.retrievalIds ??
    (opts.checkId ? [opts.checkId] : [])

  // Once everything before the first retrieval surface is done, prefer the
  // unfinished retrieval step in priority order (quiz → teach-back → cards),
  // even if TOC order differs.
  const firstRetrievalIdx = toc.findIndex((t) => retrieval.includes(t.id))
  if (firstRetrievalIdx >= 0) {
    const beforeDone = toc
      .slice(0, firstRetrievalIdx)
      .every((t) => readIds.has(t.id))
    if (beforeDone) {
      for (const id of retrieval) {
        if (toc.some((t) => t.id === id) && !readIds.has(id)) {
          return { kind: 'check', total, checkId: id }
        }
      }
    }
  }

  const next = toc.find((t) => !readIds.has(t.id))
  if (next) {
    if (retrieval.includes(next.id)) {
      return { kind: 'check', total, checkId: next.id }
    }
    return {
      kind: 'continue',
      done,
      total,
      nextId: next.id,
      nextLabel: next.label,
    }
  }

  // All toc items marked — legacy path if check tracked separately.
  if (opts.checkId && opts.checkDone === false) {
    return { kind: 'check', total, checkId: opts.checkId }
  }
  return { kind: 'complete', total }
}

const CHECK_COPY: Record<string, { title: string; body: string; cta: string }> = {
  quiz: {
    title: 'You have read all of this',
    body: 'Rereading is the weakest way to revise. Try the quick check — writing it down is what makes it stick.',
    cta: 'Go to quick check →',
  },
  teachback: {
    title: 'Explain it before you leave',
    body: 'Teach the topic back in your own words — gaps here are marks an examiner would still dock.',
    cta: 'Teach it back →',
  },
  cards: {
    title: 'Test yourself before you go',
    body: 'Guess on the flashcards first — retrieval beats flipping through notes again.',
    cta: 'Try flashcards →',
  },
}

/** Human summary for the strip. */
export function resumeMessage(state: Resume): { title: string; body: string } | null {
  switch (state.kind) {
    case 'continue':
      return {
        title: 'Welcome back',
        body: `You worked through ${state.done} of ${state.total} sections. Pick up at ${state.nextLabel}.`,
      }
    case 'check': {
      const copy = CHECK_COPY[state.checkId] ?? CHECK_COPY.quiz
      return { title: copy.title, body: copy.body }
    }
    case 'complete':
      return {
        title: 'Lesson done — one mark closes the loop',
        body: "You've read it. Examiner feedback is the part that sticks.",
      }
    default:
      return null
  }
}

export function resumeCheckCta(checkId: string): string {
  return CHECK_COPY[checkId]?.cta ?? 'Continue →'
}
