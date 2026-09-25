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
  /**
   * Where /mark sends the student afterwards: the 'progress' or 'vault' desk,
   * or a path (/mark keeps only the paths parseMarkReturnPath allows, such as
   * /dashboard/plan or /dashboard/assignments/<id>). Defaults to 'progress'.
   */
  returnTo?: 'progress' | 'vault' | string
  /**
   * The teacher's set item this question is (assignment_items.id). /mark
   * posts it back as `assignment_item_id`, and the marking route hands the
   * mark in against the set once it has checked the student may.
   */
  assignmentItemId?: string | null
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
  if (opts.assignmentItemId) params.set('assignment', opts.assignmentItemId)
  return `/mark?${params.toString()}`
}
