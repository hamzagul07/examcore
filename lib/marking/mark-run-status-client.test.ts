import assert from 'node:assert/strict'
import {
  classifyRunStatus,
  pollMarkRunUntilSettled,
  type MarkRunStatusResult,
} from './mark-run-status-client'

// Ownership / missing row: stop for good, do not keep asking.
assert.deepEqual(classifyRunStatus(403, { error: 'x' } as never), { kind: 'gone' })
assert.deepEqual(classifyRunStatus(404, null), { kind: 'gone' })
// Outages are retried, not treated as "the run is gone".
assert.deepEqual(classifyRunStatus(500, null), { kind: 'transient' })
assert.deepEqual(classifyRunStatus(200, null), { kind: 'transient' })
assert.deepEqual(classifyRunStatus(200, { settled: false, status: 'running' }), {
  kind: 'running',
})

{
  const r = classifyRunStatus(200, {
    settled: true,
    status: 'success',
    attempt_id: 'att-1',
    marks_earned: 7,
    total_marks: 10,
  })
  assert.equal(r.kind, 'settled')
  if (r.kind === 'settled') {
    assert.equal(r.outcome.ok, true)
    assert.equal(r.outcome.attemptId, 'att-1')
    assert.equal(r.outcome.marksEarned, 7)
    assert.equal(r.outcome.totalMarks, 10)
  }
}

// A "success" with no attempt row is not something the student can be shown.
{
  const r = classifyRunStatus(200, { settled: true, status: 'success', attempt_id: null })
  assert.equal(r.kind === 'settled' && r.outcome.ok, false)
}
{
  const r = classifyRunStatus(200, { settled: true, status: 'abandoned' })
  assert.equal(r.kind === 'settled' && r.outcome.status, 'abandoned')
  assert.equal(r.kind === 'settled' && r.outcome.ok, false)
}

async function main() {
  // The poller keeps going through transient failures and stops on settle.
  {
    const script: MarkRunStatusResult[] = [
      { kind: 'transient' },
      { kind: 'running' },
      {
        kind: 'settled',
        outcome: { status: 'success', attemptId: 'a', marksEarned: 1, totalMarks: 2, ok: true },
      },
    ]
    let calls = 0
    const result = await pollMarkRunUntilSettled('run', {
      intervalMs: 1,
      fetchStatus: async () => script[calls++],
    })
    assert.equal(calls, 3)
    assert.equal(result.kind, 'settled')
  }

  // Past the sweep horizon nothing is coming: give up as 'gone'.
  {
    let calls = 0
    const result = await pollMarkRunUntilSettled('run', {
      intervalMs: 1,
      maxWaitMs: 0,
      fetchStatus: async () => {
        calls++
        return { kind: 'running' }
      },
    })
    assert.equal(result.kind, 'gone')
    assert.equal(calls, 1)
  }

  // Abort rejects promptly instead of sleeping out the interval.
  {
    const controller = new AbortController()
    const p = pollMarkRunUntilSettled('run', {
      intervalMs: 60_000,
      signal: controller.signal,
      fetchStatus: async () => ({ kind: 'running' }),
    })
    setTimeout(() => controller.abort(), 5)
    await assert.rejects(p, (e: unknown) => (e as Error).name === 'AbortError')
  }

  console.log('mark-run-status-client: ok')
}

void main()
