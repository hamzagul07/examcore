import assert from 'node:assert/strict'
import { withGeminiAbortTimeout } from './gemini-text'
import {
  GeminiTimeoutError,
  withGeminiRetry,
} from '@/lib/marking/gemini-retry'

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
  assert.equal(calls, 3, 'initial attempt plus 2 retries on timeout')
  assert.ok(
    retryElapsed < MAX_RETRY_ELAPSED_MS,
    `retries completed in ${retryElapsed}ms`
  )

  console.log('gemini-call-timeout.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
