import assert from 'node:assert/strict'
import { withGeminiAbortTimeout } from './gemini-text'
import {
  GeminiTimeoutError,
  MAX_HUNG_ATTEMPTS,
  withGeminiRetry,
} from '@/lib/marking/gemini-retry'
import {
  requestBackendOverride,
  withRequestDeadline,
} from '@/lib/ai/request-deadline'

const HUNG_CALL_MS = 50
const MAX_SINGLE_TIMEOUT_MS = 200
const MAX_RETRY_ELAPSED_MS = 2_000

async function hungVertexCall(): Promise<string> {
  return withGeminiAbortTimeout(
    () => new Promise<string>(() => {}),
    HUNG_CALL_MS
  )
}

async function main() {
  const timeoutStart = Date.now()
  try {
    await hungVertexCall()
    assert.fail('expected GeminiTimeoutError')
  } catch (err) {
    assert.ok(err instanceof GeminiTimeoutError)
    assert.equal(err.timeoutMs, HUNG_CALL_MS)
  }
  const timeoutElapsed = Date.now() - timeoutStart
  assert.ok(
    timeoutElapsed >= HUNG_CALL_MS - 5 && timeoutElapsed < MAX_SINGLE_TIMEOUT_MS,
    `timeout fired in ${timeoutElapsed}ms (expected ~${HUNG_CALL_MS}ms)`
  )

  let calls = 0
  const retryStart = Date.now()
  try {
    await withGeminiRetry(() => {
      calls++
      return hungVertexCall()
    }, { maxRetries: 2, baseDelayMs: 5, label: 'test-hung-retry' })
    assert.fail('expected GeminiTimeoutError after retries')
  } catch (err) {
    assert.ok(err instanceof GeminiTimeoutError)
  }
  const retryElapsed = Date.now() - retryStart
  // Not "initial attempt plus 2 retries": a call that hung for its whole
  // timeout twice is stopped there, however many retries the caller allowed.
  assert.equal(calls, MAX_HUNG_ATTEMPTS, 'a hung call gets exactly one more go')
  assert.ok(
    retryElapsed < MAX_RETRY_ELAPSED_MS,
    `retries completed in ${retryElapsed}ms`
  )

  // The production shape (2026-08-30, 09-05, 09-21): a generous retry budget
  // and a read that never comes back. Before, that was six 120s attempts and
  // a twelve-minute wait for "try again"; now it is two.
  {
    let hung = 0
    const t0 = Date.now()
    await withGeminiRetry(() => {
      hung++
      return hungVertexCall()
    }, { maxRetries: 8, baseDelayMs: 5, label: 'test-hung-budget' }).catch((err) => {
      assert.ok(err instanceof GeminiTimeoutError, 'the timeout itself is what surfaces')
    })
    assert.equal(hung, MAX_HUNG_ATTEMPTS, `stopped after ${MAX_HUNG_ATTEMPTS} of 9 allowed attempts`)
    // Outside a request scope there is no backend to switch to, so the one
    // retry takes the ordinary short nap; the point is the count, not the nap.
    assert.ok(Date.now() - t0 < MAX_RETRY_ELAPSED_MS, `two attempts and one nap in ${Date.now() - t0}ms`)
  }

  // The first hang re-routes to the other backend when one is credentialed —
  // a different path is worth one more attempt; the same path is not.
  {
    process.env.GEMINI_API_KEY ??= 'test-key'
    process.env.GOOGLE_CLOUD_PROJECT ??= 'test-project'
    const { fallbackGeminiBackend } = await import('@/lib/ai/gemini-config')
    const { geminiBackendLabel } = await import('@/lib/ai/gemini-config')
    await withRequestDeadline(60_000, async () => {
      const expected = fallbackGeminiBackend()
      assert.ok(expected, 'both backends credentialed for this check')
      const seen: string[] = []
      const t0 = Date.now()
      let surfaced: unknown
      await withGeminiRetry(() => {
        seen.push(geminiBackendLabel())
        return hungVertexCall()
      }, { maxRetries: 8, baseDelayMs: 5, label: 'test-hung-failover' }).catch((err) => {
        surfaced = err
      })
      assert.ok(surfaced instanceof GeminiTimeoutError, 'the timeout is what surfaces')
      assert.equal(seen.length, MAX_HUNG_ATTEMPTS)
      assert.notEqual(seen[0], seen[1], 'the second attempt ran on the other backend')
      assert.equal(seen[1], expected)
      assert.equal(requestBackendOverride(), expected)
      // The re-route is the one path with no nap at all.
      assert.ok(Date.now() - t0 < 2 * HUNG_CALL_MS + 100, `no backoff nap on the re-route (${Date.now() - t0}ms)`)
    })

    // The path this exists for: the hang was on one backend, the other serves.
    await withRequestDeadline(60_000, async () => {
      let n = 0
      const value = await withGeminiRetry(async () => {
        n++
        if (n === 1) return hungVertexCall()
        return 'served'
      }, { maxRetries: 8, baseDelayMs: 5, label: 'test-hung-recover' })
      assert.equal(value, 'served')
      assert.equal(n, 2, 'served on the re-routed attempt')
    })

    // A request that already spent its one switch on a 429 gets the plain
    // retry for a later hang: one nap, one more go, then stop.
    await withRequestDeadline(60_000, async () => {
      let n = 0
      await withGeminiRetry(async () => {
        n++
        if (n === 1) throw new Error('429 RESOURCE_EXHAUSTED: rate limit')
        return hungVertexCall()
      }, { maxRetries: 8, baseDelayMs: 5, label: 'test-switch-then-hang' }).catch(() => {})
      assert.equal(n, 1 + MAX_HUNG_ATTEMPTS, 'the 429 re-route, then two hung attempts')
    })
  }

  // With the budget gone, a "hang" is the deadline talking: surface it as the
  // deadline so the route settles the run instead of placeholdering a question.
  {
    const { RequestDeadlineExceededError } = await import('@/lib/ai/request-deadline')
    await withRequestDeadline(1, async () => {
      await new Promise((r) => setTimeout(r, 5))
      let n = 0
      let surfaced: unknown
      await withGeminiRetry(() => {
        n++
        return hungVertexCall()
      }, { maxRetries: 8, baseDelayMs: 5, label: 'test-hung-no-budget' }).catch((err) => {
        surfaced = err
      })
      assert.ok(surfaced instanceof RequestDeadlineExceededError, `deadline error surfaces, got ${String(surfaced)}`)
      assert.ok(n <= MAX_HUNG_ATTEMPTS)
    })
  }

  // A fast retryable "no" is still retried the old way: three UNAVAILABLEs
  // then a success is four calls, not a stopped run.
  {
    let n = 0
    const value = await withGeminiRetry(async () => {
      n++
      if (n <= 3) throw new Error('503 UNAVAILABLE: The model is overloaded')
      return 'served'
    }, { maxRetries: 8, baseDelayMs: 5, label: 'test-overload-path' })
    assert.equal(value, 'served')
    assert.equal(n, 4, 'capacity errors keep their backoff retries')
  }

  // A real (non-timeout) failure must pass through UNCHANGED — not be masked as a
  // GeminiTimeoutError. If it were wrapped, the retry classifier would treat a
  // genuine 400/permission/quota error as a transient timeout and retry a call
  // that can never succeed, burning the request budget.
  const realError = new Error('vertex 400: invalid argument')
  let seen: unknown
  try {
    await withGeminiAbortTimeout(async () => {
      throw realError
    }, 1_000)
    assert.fail('expected the underlying error to propagate')
  } catch (err) {
    seen = err
  }
  assert.equal(seen, realError, 'non-timeout error is rethrown as-is')
  assert.ok(!(seen instanceof GeminiTimeoutError), 'not masked as a timeout')

  // A fast success returns its value and does not spuriously time out (the timer
  // is cleared) — a value that resolves well inside the window comes straight back.
  const ok = await withGeminiAbortTimeout(async () => 'done', 1_000)
  assert.equal(ok, 'done', 'successful call returns its value')

  console.log('gemini-call-timeout.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
