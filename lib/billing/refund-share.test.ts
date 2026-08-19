import assert from 'node:assert/strict'
import { refundedCreditShare } from './refund-share'

// The bug: any refund reversed the whole pack. A 10% goodwill refund on a
// 500-credit pack took up to 500 credits, so the customer paid for 450 and kept
// none of them.
assert.equal(
  refundedCreditShare(500, 1000, 10000),
  50,
  'a 10% refund reverses 10% of the pack'
)

// A full refund still reverses everything.
assert.equal(refundedCreditShare(500, 10000, 10000), 500, 'full refund, full pack')
assert.equal(
  refundedCreditShare(500, 12000, 10000),
  500,
  'an over-refund cannot reverse more than the pack'
)

// Rounding is to the nearest whole credit, and never escapes the pack.
assert.equal(refundedCreditShare(25, 3300, 10000), 8, '33% of 25 rounds to 8')
assert.equal(refundedCreditShare(25, 1, 10000), 0, 'a token refund reverses nothing')

// Missing or unusable amounts fall back to the whole pack. Reversing nothing on
// a genuinely full refund is the worse error, so the fallback is deliberate.
for (const [refunded, total] of [
  [null, 10000],
  [1000, null],
  [undefined, undefined],
  [1000, 0],
  [-5, 10000],
  [Number.NaN, 10000],
] as Array<[number | null | undefined, number | null | undefined]>) {
  assert.equal(
    refundedCreditShare(100, refunded, total),
    100,
    `falls back to the full pack for (${String(refunded)}, ${String(total)})`
  )
}

console.log('refund-share.test.ts: ok')
