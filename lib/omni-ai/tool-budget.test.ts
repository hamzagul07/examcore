import assert from 'node:assert/strict'
import {
  MAX_TOOL_RESULT_CHARS,
  MAX_TOOL_ROUNDS,
  TOOL_BUDGET_EXHAUSTED_ERROR,
  chargeToolResult,
  createToolBudget,
  fitToolPayload,
} from './tool-budget'

assert.equal(MAX_TOOL_ROUNDS, 3)
assert.equal(MAX_TOOL_RESULT_CHARS, 24_000)

// A payload that fits is returned as is and charged exactly.
{
  const budget = createToolBudget(1_000)
  const payload = { attempts: [{ id: 'a', score: '3/5' }] }
  const out = chargeToolResult(budget, payload)
  assert.deepEqual(out, payload)
  assert.equal(budget.remainingChars, 1_000 - JSON.stringify(payload).length)
}

// A detail string is cut to fit and flagged.
{
  const payload = { attempt_id: 'a', detail: 'x'.repeat(5_000), note: 'n' }
  const fitted = fitToolPayload(payload, 1_000)
  assert.ok(fitted)
  assert.ok(JSON.stringify(fitted).length <= 1_000)
  assert.equal(fitted.truncated, true)
  assert.ok(String(fitted.detail).endsWith('…[truncated: budget]'))
  assert.equal(fitted.attempt_id, 'a')
}

// A listing loses items from the tail and reports how many.
{
  const attempts = Array.from({ length: 10 }, (_, i) => ({
    id: `id-${i}`,
    summary_excerpt: 's'.repeat(300),
  }))
  const fitted = fitToolPayload({ attempts, note: 'n' }, 1_500)
  assert.ok(fitted)
  assert.ok(JSON.stringify(fitted).length <= 1_500)
  const kept = fitted.attempts as unknown[]
  assert.ok(kept.length >= 1 && kept.length < 10)
  assert.equal(fitted.omitted_count, 10 - kept.length)
  assert.equal(fitted.truncated, true)
  // Kept items are the newest (head of the list).
  assert.equal((kept[0] as { id: string }).id, 'id-0')
}

// Nothing useful fits → the exhausted error, and the budget goes to zero so
// subsequent calls on the same turn get the same answer.
{
  const budget = createToolBudget(100)
  const out = chargeToolResult(budget, {
    attempt_id: 'a',
    detail: 'y'.repeat(2_000),
  })
  assert.deepEqual(out, { error: TOOL_BUDGET_EXHAUSTED_ERROR })
  assert.equal(budget.remainingChars, 0)
  const again = chargeToolResult(budget, { attempts: [{ id: 'b' }] })
  assert.deepEqual(again, { error: TOOL_BUDGET_EXHAUSTED_ERROR })
}

// The budget accumulates across calls within a turn: three 10k details do
// not all fit in 24k.
{
  const budget = createToolBudget()
  const big = () => ({ attempt_id: 'a', detail: 'z'.repeat(10_000) })
  const first = chargeToolResult(budget, big())
  const second = chargeToolResult(budget, big())
  const third = chargeToolResult(budget, big())
  assert.equal(first.truncated, undefined)
  assert.equal(second.truncated, undefined)
  assert.equal(third.truncated, true)
  assert.ok(budget.remainingChars >= 0)
  const total =
    JSON.stringify(first).length +
    JSON.stringify(second).length +
    JSON.stringify(third).length
  assert.ok(total <= MAX_TOOL_RESULT_CHARS, `total ${total}`)
}

// Unknown shapes that do not fit are refused rather than mangled.
assert.equal(fitToolPayload({ blob: 'q'.repeat(500) }, 100), null)
assert.equal(fitToolPayload({ error: 'x' }, 0), null)

console.log('omni tool-budget: ok')
