import assert from 'node:assert/strict'
import {
  canEnterConfirm,
  createInitialContext,
  markFlowReducer,
} from './mark-flow-machine'
import { emptyDraft } from './types'

function check(label: string, ok: boolean) {
  if (!ok) throw new Error(`FAIL: ${label}`)
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      pageCount: 1,
      inputKind: 'photos',
      questionText: 'Find dy/dx if y = x^2. [3]',
      totalMarksHint: 3,
    },
  })
  const blocked = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('practice needs subject', blocked.state === 'capture')
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { subjectCode: '9709' },
  })
  ctx = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('one answer reaches confirm with subject + question + pages + total', ctx.state === 'confirm')
  ctx = markFlowReducer(ctx, { type: 'START_MARKING' })
  ctx = markFlowReducer(ctx, { type: 'MARKING_FAILED', error: 'timeout' })
  check('failure returns to confirm', ctx.state === 'confirm' && ctx.error === 'timeout')
}

// The reducer's guard IS the screen's guard: the total the Confirm button
// requires is required here too, so Continue can never light up for a
// transition the reducer refuses.
{
  const base = {
    ...emptyDraft({ subjectCode: '9709' }),
    pageCount: 1,
    inputKind: 'photos' as const,
    questionText: 'Find dy/dx if y = x^2. [3]',
  }
  check('practice without total is blocked', !canEnterConfirm({ ...base, totalMarksHint: null }))
  check('practice with total continues', canEnterConfirm({ ...base, totalMarksHint: 3 }))
  check('total above the bound is blocked', !canEnterConfirm({ ...base, totalMarksHint: 101 }))
  check('total of zero is blocked', !canEnterConfirm({ ...base, totalMarksHint: 0 }))
}

// A PDF is an uploaded answer even though it clears the page count.
{
  const draft = {
    ...emptyDraft({ subjectCode: '9709' }),
    pageCount: 0,
    hasPdf: true,
    inputKind: 'pdf' as const,
    questionText: 'Find dy/dx if y = x^2. [3]',
    totalMarksHint: 3,
  }
  check('pdf-only practice continues', canEnterConfirm(draft))
  const ctx = markFlowReducer(
    { ...createInitialContext(), draft },
    { type: 'CONTINUE_TO_CONFIRM' }
  )
  check('reducer accepts pdf-only', ctx.state === 'confirm')
  check(
    'pdf-only whole paper continues',
    canEnterConfirm({
      ...emptyDraft({ scope: 'whole_paper' }),
      hasPdf: true,
      paperCode: '9709/12',
      paperSession: 'May/June 2024',
    })
  )
}

{
  let ctx = createInitialContext({ scope: 'whole_paper' })
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { pageCount: 3, inputKind: 'photos' },
  })
  let next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('whole paper needs paper code/session', next.state === 'capture')
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { paperCode: '9709/12', paperSession: 'May/June 2024' },
  })
  next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('whole paper reaches confirm with paper meta (no total needed)', next.state === 'confirm')
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { pageCount: 1, inputKind: 'photos', totalMarksHint: 3 },
  })
  const next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('one answer blocked without question context', next.state === 'capture')
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      pageCount: 1,
      inputKind: 'photos',
      questionText: 'Solve x^2 = 4. [2]',
      subjectCode: '9709',
      totalMarksHint: 2,
    },
  })
  ctx = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  ctx = markFlowReducer(ctx, { type: 'START_MARKING' })
  ctx = markFlowReducer(ctx, { type: 'CANCEL_MARKING' })
  check('cancel returns to confirm with draft', ctx.state === 'confirm' && !ctx.error)
  check('cancel keeps page count', ctx.draft.pageCount === 1)
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'SEED_DRAFT',
    patch: { subjectCode: '9702' },
  })
  check('seed sets subject without dirty', ctx.draft.subjectCode === '9702' && !ctx.draft.dirty)
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      subjectCode: '9709',
      pageCount: 1,
      inputKind: 'photos',
      questionText: 'Differentiate y = x^3. [4]',
      totalMarksHint: 4,
    },
  })
  ctx = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  ctx = markFlowReducer(ctx, { type: 'START_MARKING' })
  ctx = markFlowReducer(ctx, { type: 'MARKING_DONE' })
  check('marking done reaches result', ctx.state === 'result')
  ctx = markFlowReducer(ctx, { type: 'MARK_ANOTHER' })
  check('mark another returns to capture', ctx.state === 'capture')
  check('mark another clears pages', ctx.draft.pageCount === 0 && !ctx.draft.hasPdf)
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      questionSource: 'past_paper',
      pageCount: 1,
      inputKind: 'photos',
      paperCode: '9709/12',
      paperSession: 'May/June 2024',
      totalMarksHint: 5,
    },
  })
  let next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('past paper needs question number', next.state === 'capture')
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { questionNumber: '5' },
  })
  next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('past paper reaches confirm without typed stem', next.state === 'confirm')
  const noTotal = markFlowReducer(
    markFlowReducer(ctx, { type: 'PATCH_DRAFT', patch: { totalMarksHint: null } }),
    { type: 'CONTINUE_TO_CONFIRM' }
  )
  check('past paper still needs a total (scheme may be unbanked)', noTotal.state === 'capture')
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      practiceKind: 'combined_script',
      pageCount: 2,
      inputKind: 'photos',
      totalMarksHint: 6,
    },
  })
  let next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('combined script needs subject', next.state === 'capture')
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { subjectCode: '9709' },
  })
  next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('combined script reaches confirm without separate question', next.state === 'confirm')

  ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: {
      practiceKind: 'combined_script',
      subjectCode: '9709',
      inputKind: 'typed',
      typedAnswer: 'lots of working here for the marker',
      pageCount: 0,
      totalMarksHint: 6,
    },
  })
  next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('combined script blocks typed-only', next.state === 'capture')
}

assert.ok(true)
console.log('mark-flow-machine: ok')
