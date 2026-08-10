/**
 * Canonical /mark deep-link for a banked Cambridge past-paper question.
 * Always uses practice=1 + q + a full session label so pickers fill and the
 * student only needs to submit an answer.
 */
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'

export type PastPaperMarkHrefOpts = {
  paperCode: string
  paperSession: string
  questionNumber: string
  pattern?: string
  reason?: string
  returnTo?: 'progress' | 'vault' | string
}

export function pastPaperMarkHref(opts: PastPaperMarkHrefOpts): string {
  const session = normalizePaperSession(opts.paperSession).label || opts.paperSession
  const params = new URLSearchParams({
    practice: '1',
    paper: opts.paperCode,
    session,
    q: opts.questionNumber,
    return:
      opts.returnTo === 'vault'
        ? 'vault'
        : opts.returnTo === 'progress' || !opts.returnTo
          ? 'progress'
          : opts.returnTo,
  })
  if (opts.pattern) params.set('pattern', opts.pattern)
  if (opts.reason) params.set('reason', opts.reason)
  return `/mark?${params.toString()}`
}
