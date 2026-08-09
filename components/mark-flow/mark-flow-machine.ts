import {
  emptyDraft,
  type MarkFlowContext,
  type MarkFlowDraft,
  type MarkFlowState,
} from './types'

export type MarkFlowEvent =
  | { type: 'PATCH_DRAFT'; patch: Partial<MarkFlowDraft> }
  /** Host profile defaults — does not set dirty (no beforeunload). */
  | { type: 'SEED_DRAFT'; patch: Partial<MarkFlowDraft> }
  | { type: 'CONTINUE_TO_CONFIRM' }
  | { type: 'BACK_TO_CAPTURE' }
  | { type: 'START_MARKING'; attemptId?: string | null }
  | { type: 'MARKING_FAILED'; error: string }
  | { type: 'CANCEL_MARKING' }
  | { type: 'MARKING_DONE' }
  | { type: 'MARK_ANOTHER' }
  | { type: 'RESET' }

const ORDER: MarkFlowState[] = ['capture', 'confirm', 'marking', 'result']

function hasQuestionContext(draft: MarkFlowDraft): boolean {
  return draft.questionText.trim().length >= 10 || draft.hasQuestionPhoto
}

function hasPastPaperContext(draft: MarkFlowDraft): boolean {
  return (
    !!draft.paperCode?.trim() &&
    !!draft.paperSession?.trim() &&
    !!draft.questionNumber?.trim()
  )
}

function canEnterConfirm(draft: MarkFlowDraft): boolean {
  if (draft.scope === 'whole_paper') {
    return (
      draft.pageCount > 0 &&
      !!draft.paperCode?.trim() &&
      !!draft.paperSession?.trim()
    )
  }
  if (draft.questionSource === 'past_paper') {
    if (!hasPastPaperContext(draft)) return false
  } else if (draft.practiceKind === 'combined_script') {
    // Scanned script: question + working on the same upload — no separate stem.
    if (!draft.subjectCode?.trim()) return false
    if (draft.inputKind === 'typed') return false
    return draft.pageCount > 0
  } else {
    if (!draft.subjectCode?.trim()) return false
    if (!hasQuestionContext(draft)) return false
  }
  if (draft.inputKind === 'typed') return draft.typedAnswer.trim().length > 0
  return draft.pageCount > 0
}

export function createInitialContext(
  partial?: Partial<Pick<MarkFlowDraft, 'board' | 'subjectCode' | 'scope'>>
): MarkFlowContext {
  return {
    state: 'capture',
    draft: emptyDraft(partial),
    attemptId: null,
    error: null,
  }
}

/**
 * Pure reducer for the Mark task state machine (R1).
 * Screens render from `state`; business APIs stay outside.
 */
export function markFlowReducer(
  ctx: MarkFlowContext,
  event: MarkFlowEvent
): MarkFlowContext {
  switch (event.type) {
    case 'PATCH_DRAFT':
      return {
        ...ctx,
        draft: { ...ctx.draft, ...event.patch, dirty: true },
        error: null,
      }
    case 'SEED_DRAFT':
      return {
        ...ctx,
        draft: { ...ctx.draft, ...event.patch, dirty: ctx.draft.dirty },
        error: null,
      }
    case 'CONTINUE_TO_CONFIRM':
      if (ctx.state !== 'capture' || !canEnterConfirm(ctx.draft)) return ctx
      return { ...ctx, state: 'confirm', error: null }
    case 'BACK_TO_CAPTURE':
      if (ctx.state !== 'confirm' && ctx.state !== 'result') return ctx
      return { ...ctx, state: 'capture', error: null }
    case 'START_MARKING':
      if (ctx.state !== 'confirm' && ctx.state !== 'capture') return ctx
      return {
        ...ctx,
        state: 'marking',
        attemptId: event.attemptId ?? ctx.attemptId,
        error: null,
        draft: { ...ctx.draft, dirty: false },
      }
    case 'MARKING_FAILED':
      if (ctx.state !== 'marking') return ctx
      return { ...ctx, state: 'confirm', error: event.error }
    case 'CANCEL_MARKING':
      // Host aborted wait — keep the draft; Confirm can re-submit.
      if (ctx.state !== 'marking') return ctx
      return { ...ctx, state: 'confirm', error: null, attemptId: null }
    case 'MARKING_DONE':
      if (ctx.state !== 'marking') return ctx
      return { ...ctx, state: 'result', error: null }
    case 'MARK_ANOTHER':
      return {
        ...createInitialContext({
          board: ctx.draft.board,
          subjectCode: ctx.draft.subjectCode,
          scope: ctx.draft.scope,
        }),
      }
    case 'RESET':
      return createInitialContext()
    default:
      return ctx
  }
}

/** Dev / tests — ensure transitions stay in the declared order when advancing. */
export function isForwardTransition(from: MarkFlowState, to: MarkFlowState): boolean {
  return ORDER.indexOf(to) >= ORDER.indexOf(from)
}
