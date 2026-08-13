import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://stub.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'stub-service-role-key'

/**
 * Per-stage timing accumulation.
 *
 * This is the measurement every subsequent latency decision is read off, so the
 * arithmetic wants pinning: time has to land on the stage that was *running*,
 * repeated stage reports must not double-count, and the stretch before the
 * first stage is announced must not be silently dropped — it is form parsing,
 * auth and file decoding, and it is invisible in `duration_ms` alone.
 *
 * The handle is a plain object and the note function is synchronous, so this
 * exercises the real code with a fake clock rather than a re-implementation.
 */
async function main() {
  const { noteMarkRunStage } = await import('@/lib/marking/mark-run-log')

  const realNow = Date.now
  let clock = 1_000_000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Date as any).now = () => clock

  try {
    // id: null keeps every DB write a no-op — we are testing the arithmetic.
    const handle = {
      id: null,
      startedAt: clock,
      retriesAtStart: 0,
      lastStage: null,
      stageStartedAt: clock,
      stageMs: {} as Record<string, number>,
      clientDisconnected: false,
    }

    // 1.2s of request setup before the pipeline announces anything.
    clock += 1200
    noteMarkRunStage(handle, 'reading_work')
    // Copied, because assert.deepEqual narrows its first argument's type and
    // would pin stageMs to this one shape for the rest of the test.
    assert.deepEqual(
      { ...handle.stageMs },
      { request_setup: 1200 },
      'pre-pipeline time is charged to request_setup, not to the first stage'
    )

    // 8s of OCR.
    clock += 8000
    noteMarkRunStage(handle, 'finding_scheme')
    assert.equal(handle.stageMs.reading_work, 8000)

    // A repeat of the same stage must not re-bank or reset the clock: the
    // multi-question path reports 'marking' once per question.
    clock += 2000
    noteMarkRunStage(handle, 'finding_scheme')
    clock += 3000
    noteMarkRunStage(handle, 'marking')
    assert.equal(
      handle.stageMs.finding_scheme,
      5000,
      'a repeated stage keeps accumulating rather than restarting'
    )

    // Stages can also recur out of order; time accumulates, never overwrites.
    clock += 60_000
    noteMarkRunStage(handle, 'verifying')
    clock += 40_000
    noteMarkRunStage(handle, 'marking')
    clock += 10_000
    noteMarkRunStage(handle, 'verifying')
    assert.equal(handle.stageMs.marking, 70_000, 'marking = 60s + 10s')
    assert.equal(handle.stageMs.verifying, 40_000)

    // Nothing is lost: banked total must equal wall-clock at the last boundary.
    const banked = Object.values(handle.stageMs).reduce((a, b) => a + b, 0)
    assert.equal(
      banked,
      clock - handle.startedAt,
      'every millisecond between open and the last boundary is attributed'
    )

    assert.equal(handle.lastStage, 'verifying')

    // A null handle is the "telemetry unavailable" path and must stay silent.
    assert.doesNotThrow(() => noteMarkRunStage(null, 'marking'))

    console.log('stage-timings.test.ts: ok')
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Date as any).now = realNow
  }
}

void main()
