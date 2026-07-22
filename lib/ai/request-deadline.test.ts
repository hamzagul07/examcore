import assert from 'node:assert/strict'
import {
  clampTimeoutToDeadline,
  hasTimeForAnotherAttempt,
  isRequestDeadlineError,
  remainingRequestMs,
  withRequestDeadline,
  MIN_CALL_TIMEOUT_MS,
  SETTLE_RESERVE_MS,
} from '@/lib/ai/request-deadline'
import { withGeminiRetry } from '@/lib/marking/gemini-retry'

async function main() {
  // Outside a request there is no budget: nothing is clamped, nothing is denied.
  assert.equal(remainingRequestMs(), null)
  assert.equal(clampTimeoutToDeadline(120_000), 120_000)
  assert.equal(hasTimeForAnotherAttempt(60_000, 120_000), true)

  await withRequestDeadline(60_000, async () => {
    const remaining = remainingRequestMs()
    assert.ok(remaining !== null && remaining > 55_000 && remaining <= 60_000)

    // A per-call timeout longer than the budget gets cut down to what's left.
    const clamped = clampTimeoutToDeadline(120_000)
    assert.ok(
      clamped <= 60_000 - SETTLE_RESERVE_MS,
      `expected clamp under budget, got ${clamped}`
    )
    // A per-call timeout already inside the budget is untouched.
    assert.equal(clampTimeoutToDeadline(10_000), 10_000)

    // An attempt that fits is allowed; one that cannot finish is not.
    assert.equal(hasTimeForAnotherAttempt(1_000, 10_000), true)
    assert.equal(hasTimeForAnotherAttempt(1_000, 120_000), false)
  })

  // The clamp must NEVER hand back more time than remains. An earlier version
  // applied a 5s floor unconditionally, so a nearly-spent budget produced a
  // timeout longer than the budget itself — the exact overshoot it exists to
  // prevent, and it ate the settle reserve too.
  await withRequestDeadline(SETTLE_RESERVE_MS + 1_000, async () => {
    const clamped = clampTimeoutToDeadline(120_000)
    assert.ok(
      clamped <= 1_000,
      `clamp must not exceed the ~1000ms left, got ${clamped}`
    )
  })
  await withRequestDeadline(-5_000, async () => {
    // Budget already blown: fail fast rather than start a doomed long call.
    assert.equal(clampTimeoutToDeadline(120_000), MIN_CALL_TIMEOUT_MS)
  })

  // The context is per-call, not global: it must not leak out of the run.
  assert.equal(remainingRequestMs(), null)

  // The behaviour that matters: a persistently failing call inside a bounded
  // budget retries for a while and then stops, rather than burning every retry
  // slot and getting the function killed mid-stream with no error event sent.
  //
  // The budget is sized so that several attempts genuinely fit — an earlier
  // version of this test used a budget so tight that `hasTimeForAnotherAttempt`
  // could never be true, so it passed after a single attempt and would not have
  // caught an off-by-one in the guard.
  let attempts = 0
  const startedAt = Date.now()
  await assert.rejects(
    withRequestDeadline(6_000, () =>
      withGeminiRetry(
        async () => {
          attempts += 1
          await new Promise((r) => setTimeout(r, 300))
          throw Object.assign(new Error('server overloaded'), { status: 503 })
        },
        { maxRetries: 50, baseDelayMs: 100, label: 'test-deadline' }
      )
    ),
    (err: unknown) => isRequestDeadlineError(err)
  )
  const elapsed = Date.now() - startedAt
  assert.ok(
    attempts > 1,
    'the guard should allow retries that still fit in the budget'
  )
  assert.ok(
    attempts < 50,
    `expected the deadline to cut retries short, ran all ${attempts}`
  )
  assert.ok(
    elapsed < 6_000,
    `expected to stop before the budget expired, took ${elapsed}ms`
  )

  // The root cause must survive, or telemetry records "ran out of time" and
  // loses the diagnosis (503 storm vs slow-but-healthy model).
  const deadlineErr = await withRequestDeadline(1_500, () =>
    withGeminiRetry(
      async () => {
        throw Object.assign(new Error('server overloaded'), { status: 503 })
      },
      { maxRetries: 5, baseDelayMs: 800, label: 'test-cause' }
    )
  ).catch((e: unknown) => e)
  assert.ok(isRequestDeadlineError(deadlineErr))
  assert.match(
    (deadlineErr as Error).message,
    /server overloaded/,
    'deadline error should carry the underlying failure'
  )
  assert.ok(
    (deadlineErr as Error).cause instanceof Error,
    'deadline error should chain the original error as `cause`'
  )

  // Without a deadline the same call still exhausts its retry allowance, so
  // batch scripts keep their existing resilience.
  let unboundedAttempts = 0
  await assert.rejects(
    withGeminiRetry(
      async () => {
        unboundedAttempts += 1
        throw Object.assign(new Error('server overloaded'), { status: 503 })
      },
      { maxRetries: 3, baseDelayMs: 1, label: 'test-unbounded' }
    )
  )
  assert.equal(unboundedAttempts, 4) // initial + 3 retries

  console.log('request-deadline.test.ts: ok')
}

void main()
