import assert from 'node:assert/strict'
import {
  noteRequestRetry,
  requestRetryCount,
  withRequestDeadline,
} from '@/lib/ai/request-deadline'

async function main() {
  // Outside a request there is no scoped count.
  assert.equal(requestRetryCount(), null)

  await withRequestDeadline(60_000, async () => {
    assert.equal(requestRetryCount(), 0)
    noteRequestRetry()
    noteRequestRetry()
    noteRequestRetry()
    assert.equal(requestRetryCount(), 3)
  })

  // Scope does not leak out of the run.
  assert.equal(requestRetryCount(), null)

  // The bug this fixes: a concurrent reset of the module-global counter used to
  // zero mark_runs.gemini_retries mid-run. The request-scoped counter is a plain
  // field on the AsyncLocalStorage context, so nothing external can reset it —
  // two overlapping requests keep independent counts, and a global reset in
  // between is irrelevant.
  const a = withRequestDeadline(60_000, async () => {
    noteRequestRetry()
    await new Promise((r) => setTimeout(r, 20))
    noteRequestRetry()
    return requestRetryCount()
  })
  const b = withRequestDeadline(60_000, async () => {
    noteRequestRetry()
    return requestRetryCount()
  })
  const [ra, rb] = await Promise.all([a, b])
  assert.equal(ra, 2, 'request A counts only its own retries')
  assert.equal(rb, 1, 'request B counts only its own retries')

  console.log('request-retry-scope.test.ts: ok')
}

void main()
