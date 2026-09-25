import assert from 'node:assert/strict'
import {
  BillingUnavailableError,
  interpretReserveResult,
  maxQuestionsForReservation,
  type MarkAllowance,
} from '@/lib/billing/enforcement'

// --- interpretReserveResult: the gate's branch table --------------------------
// v2 RPC (credits held under the lock) — the reservation carries the credits.
{
  const read = interpretReserveResult(
    {
      reserved: true,
      used: 120,
      event_id: 'e1',
      via_credit: true,
      credits_held: 2,
      count: 3,
      credit_balance: 8,
    },
    { count: 3, creditBalance: 10, legacy: false }
  )
  assert.deepEqual(read, {
    eventId: 'e1',
    viaCredit: true,
    creditsHeld: 2,
    used: 120,
    creditBalance: 8,
    blocked: false,
  })
}
// v2 RPC, nothing left and no credits: blocked, and the RPC's balance wins
// over the one read before the lock.
{
  const read = interpretReserveResult(
    { reserved: false, used: 5, count: 1, via_credit: false, credits_held: 0, credit_balance: 0 },
    { count: 1, creditBalance: 1, legacy: false }
  )
  assert.equal(read.blocked, true, 'v2 said no → no (it already tried credits)')
  assert.equal(read.creditBalance, 0, 'the locked read is the truth')
  assert.equal(read.viaCredit, false)
}
// Plain allowance reservation: no credits involved.
{
  const read = interpretReserveResult(
    { reserved: true, used: 3, event_id: 'e2', via_credit: false, credits_held: 0, count: 1 },
    { count: 1, creditBalance: 0, legacy: false }
  )
  assert.equal(read.eventId, 'e2')
  assert.equal(read.viaCredit, false)
  assert.equal(read.creditsHeld, 0)
}

// Legacy RPC (pre-migration): knows nothing of credits, so a balance that
// covers the count proceeds via credit, consumed at finalize. The old race —
// kept only until the migration is applied.
{
  const read = interpretReserveResult({ reserved: false, used: 5 }, { count: 1, creditBalance: 1, legacy: true })
  assert.deepEqual(read, {
    eventId: null,
    viaCredit: true,
    creditsHeld: 0,
    used: 5,
    creditBalance: 1,
    blocked: false,
  })
}
{
  // …but not when the balance cannot cover the whole reservation.
  const read = interpretReserveResult({ reserved: false, used: 5 }, { count: 3, creditBalance: 2, legacy: true })
  assert.equal(read.blocked, true, 'all-or-nothing on the legacy path too')
}
{
  const read = interpretReserveResult({ reserved: false, used: 5 }, { count: 1, creditBalance: 0, legacy: true })
  assert.equal(read.blocked, true)
}
// A legacy multi-reservation stitched together by the caller.
{
  const read = interpretReserveResult(
    { reserved: true, used: 7, event_id: 'first', count: 2 },
    { count: 2, creditBalance: 0, legacy: true }
  )
  assert.equal(read.eventId, 'first')
  assert.equal(read.creditsHeld, 0)
  assert.equal(read.blocked, false)
}
// Garbage in (an empty object from a null RPC result) reads as blocked with
// nothing written, never as "reserved".
{
  const read = interpretReserveResult({}, { count: 1, creditBalance: 0, legacy: false })
  assert.equal(read.blocked, true)
  assert.equal(read.eventId, null)
  assert.equal(read.used, 0)
}

// --- BillingUnavailableError: fail closed, say so, charge nothing -------------
{
  const err = new BillingUnavailableError('connection refused')
  assert.equal(err.status, 503)
  assert.equal(err.body.code, 'billing_unavailable')
  assert.equal(err.body.retry, true)
  assert.match(err.body.message, /Nothing was charged/)
  // Both mark clients display `error` verbatim, so it must be the sentence,
  // not the code: a student once read "billing_unavailable" on the wait card.
  assert.equal(err.body.error, err.body.message)
  assert.match(err.body.error, /try again in a minute/)
  assert.ok(err instanceof Error)
  assert.equal(err.name, 'BillingUnavailableError')
  // The infra detail stays in logs, never in the body sent to the client.
  assert.equal(JSON.stringify(err.body).includes('connection refused'), false)
}

// --- maxQuestionsForReservation: bound the MARKING, not just the ledger ------
const allowance = (over: Partial<MarkAllowance>): MarkAllowance => ({
  allowed: true,
  blocked_by_mode: false,
  remaining: 0,
  used: 5,
  marks_used: 5,
  cap: 5,
  credit_balance: 0,
  tier: 'free',
  status: 'active',
  access: 'free',
  warning: false,
  enforcement_mode: 'enforce',
  teacher_seat: false,
  ...over,
})
// The bug: free user at 4/5 uploads a 15-question script. One reserved, one
// left, no credits → two questions may be marked, not fifteen.
assert.equal(
  maxQuestionsForReservation({ count: 1, allowance: allowance({ used: 5, remaining: 0 }) }),
  1,
  'the reserved question is always covered'
)
assert.equal(
  maxQuestionsForReservation({ count: 1, allowance: allowance({ used: 4, remaining: 1 }) }),
  2
)
// Credits extend the bound: they are consumed per extra question.
assert.equal(
  maxQuestionsForReservation({
    count: 1,
    allowance: allowance({ used: 4, remaining: 1, credit_balance: 3 }),
  }),
  5
)
// A multi-count reservation counts its own slots.
assert.equal(
  maxQuestionsForReservation({ count: 3, allowance: allowance({ used: 3, remaining: 2 }) }),
  5
)
// warn / off: the allowance never bounds marking (over-cap rows are written
// as today), so the pipeline sees no bound and applies its hard cap only.
assert.equal(
  maxQuestionsForReservation({ count: 1, allowance: allowance({ enforcement_mode: 'warn' }) }),
  null
)
assert.equal(
  maxQuestionsForReservation({ count: 1, allowance: allowance({ enforcement_mode: 'off' }) }),
  null
)
// Garbage never lowers the bound below the paid-for question or throws.
assert.equal(
  maxQuestionsForReservation({
    count: 1,
    allowance: allowance({ remaining: Number.NaN, credit_balance: -4 }),
  }),
  1
)

console.log('reservation.test.ts: ok')
