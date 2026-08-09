import {
  createInitialContext,
  markFlowReducer,
} from './mark-flow-machine'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

{
  const ctx = createInitialContext()
  const next = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('stays on capture without input', next.state === 'capture')
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { inputKind: 'typed', typedAnswer: 'x = 2' },
  })
  ctx = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  check('typed answer reaches confirm', ctx.state === 'confirm')
  ctx = markFlowReducer(ctx, { type: 'START_MARKING', attemptId: 'a1' })
  check('confirm → marking', ctx.state === 'marking' && ctx.attemptId === 'a1')
  ctx = markFlowReducer(ctx, { type: 'MARKING_DONE' })
  check('marking → result', ctx.state === 'result')
}

{
  let ctx = createInitialContext()
  ctx = markFlowReducer(ctx, {
    type: 'PATCH_DRAFT',
    patch: { pageCount: 2, inputKind: 'photos' },
  })
  ctx = markFlowReducer(ctx, { type: 'CONTINUE_TO_CONFIRM' })
  ctx = markFlowReducer(ctx, { type: 'START_MARKING' })
  ctx = markFlowReducer(ctx, { type: 'MARKING_FAILED', error: 'timeout' })
  check('failure returns to confirm', ctx.state === 'confirm' && ctx.error === 'timeout')
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
  check('whole paper reaches confirm with paper meta', next.state === 'confirm')
}

if (failed) {
  console.error(`${failed} mark-flow-machine checks failed`)
  process.exit(1)
}
console.log('mark-flow-machine: ok')
