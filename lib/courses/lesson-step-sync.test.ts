import { stepForBlockIndex, activeBlockIndex } from './lesson-step-sync'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// --- stepForBlockIndex ---

check('first block is step 1', stepForBlockIndex(0, 4) === 1)
check('third block is step 3', stepForBlockIndex(2, 4) === 3)
check('last block is last step', stepForBlockIndex(3, 4) === 4)

// More prose sections than diagram beats is the common case: hold, don't wrap.
check('overflow holds on final step', stepForBlockIndex(7, 4) === 4)
check('far overflow still holds', stepForBlockIndex(99, 4) === 4)

// Fewer blocks than steps: never advance past what the reader has reached.
check('underflow does not skip ahead', stepForBlockIndex(1, 9) === 2)

// Degenerate inputs must not produce step 0 — the shell treats step as 1-based.
check('no steps yields 1', stepForBlockIndex(3, 0) === 1)
check('negative index clamps to 1', stepForBlockIndex(-2, 4) === 1)

// --- activeBlockIndex ---

check('nothing visible yields null', activeBlockIndex([]) === null)
check(
  'zero-ratio entries are ignored',
  activeBlockIndex([{ index: 2, ratio: 0, top: 10 }]) === null
)
check(
  'most visible wins',
  activeBlockIndex([
    { index: 0, ratio: 0.2, top: -300 },
    { index: 1, ratio: 0.8, top: 120 },
  ]) === 1
)
check(
  'most visible wins regardless of order',
  activeBlockIndex([
    { index: 1, ratio: 0.8, top: 120 },
    { index: 0, ratio: 0.2, top: -300 },
  ]) === 1
)

// The tie case is the one that matters: mid-scroll across a block boundary both
// halves report the same ratio, and picking the lower block would run the
// diagram a step ahead of the prose the reader is on.
check(
  'ties prefer the higher block',
  activeBlockIndex([
    { index: 3, ratio: 0.5, top: 400 },
    { index: 2, ratio: 0.5, top: -50 },
  ]) === 2
)

check(
  'single visible block is chosen',
  activeBlockIndex([{ index: 5, ratio: 0.34, top: 60 }]) === 5
)

if (failed > 0) process.exit(1)
console.log('lesson-step-sync.test.ts: all checks passed')
