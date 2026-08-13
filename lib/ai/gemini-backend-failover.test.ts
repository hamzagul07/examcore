import assert from 'node:assert/strict'
import {
  requestBackendOverride,
  setRequestBackendOverride,
  withRequestDeadline,
} from '@/lib/ai/request-deadline'

/**
 * Backend failover on capacity errors.
 *
 * The behaviour under test is why this exists at all: across the first 28 marks,
 * runs that hit a Gemini retry averaged 384s against 128s for runs that did not,
 * because a 429 was answered with a nap rather than a re-route. The switch has
 * to be request-scoped (one mark's 429 must not move every other in-flight
 * mark) and it has to happen at most once (two overloaded providers must not be
 * ping-ponged between until the deadline runs out).
 */
async function main() {
  const { fallbackGeminiBackend, geminiBackendLabel, isBackendCredentialed } =
    await import('@/lib/ai/gemini-config')

  // --- scope -----------------------------------------------------------------
  assert.equal(
    requestBackendOverride(),
    null,
    'no override outside a request scope'
  )
  assert.equal(
    setRequestBackendOverride('vertex'),
    false,
    'cannot fail over without a request to scope the switch to'
  )

  await withRequestDeadline(60_000, async () => {
    assert.equal(requestBackendOverride(), null, 'starts on the configured backend')
    assert.equal(setRequestBackendOverride('api-key'), true, 'first switch takes')
    assert.equal(requestBackendOverride(), 'api-key')
    assert.equal(
      geminiBackendLabel(),
      'api-key',
      'everything downstream follows the override from one source of truth'
    )
    assert.equal(
      setRequestBackendOverride('api-key'),
      false,
      'switching to the backend we are already on is refused'
    )
    // The ping-pong guard, and the reason this test exists. Without the
    // one-switch cap, a second capacity error bounces the request back to the
    // provider that just rejected it, and every hop skips the backoff — the
    // retry budget is gone in seconds and a mark that waiting would have
    // completed fails instead.
    assert.equal(
      setRequestBackendOverride('vertex'),
      false,
      'a request gets exactly one failover, then falls back to backoff'
    )
    assert.equal(
      requestBackendOverride(),
      'api-key',
      'the refused bounce leaves the request where it was'
    )
  })

  assert.equal(requestBackendOverride(), null, 'override does not leak out')

  // --- isolation between concurrent marks ------------------------------------
  const a = withRequestDeadline(60_000, async () => {
    setRequestBackendOverride('api-key')
    await new Promise((r) => setTimeout(r, 20))
    return requestBackendOverride()
  })
  const b = withRequestDeadline(60_000, async () => requestBackendOverride())
  const [ra, rb] = await Promise.all([a, b])
  assert.equal(ra, 'api-key', 'the failed-over request stays failed over')
  assert.equal(rb, null, 'a concurrent request is not dragged along with it')

  // --- fallback selection ----------------------------------------------------
  // Only claim a fallback when the other backend actually has credentials;
  // routing to an unconfigured provider would turn a slow mark into a failed one.
  await withRequestDeadline(60_000, async () => {
    const fallback = fallbackGeminiBackend()
    if (fallback) {
      assert.notEqual(
        fallback,
        geminiBackendLabel(),
        'fallback is never the backend we are already on'
      )
      assert.equal(
        isBackendCredentialed(fallback),
        true,
        'fallback is only offered when it is credentialed'
      )
      // Once switched, the request is spent: the lookup may still name the
      // original backend, but the switch itself is refused.
      assert.equal(setRequestBackendOverride(fallback), true, 'the one switch')
      assert.equal(
        setRequestBackendOverride(geminiBackendLabel()),
        false,
        'no second switch, whichever backend it targets'
      )
    }
  })

  console.log('gemini-backend-failover.test.ts: ok')
}

void main()
