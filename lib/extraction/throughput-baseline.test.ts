import assert from 'node:assert/strict'
import {
  computePeakTpm,
  recommendConcurrency,
} from './throughput-baseline'
import type { ApiCallRecord } from '@/lib/ai/gemini-metrics'

function record(
  partial: Partial<ApiCallRecord> & Pick<ApiCallRecord, 'timestamp' | 'totalTokens'>
): ApiCallRecord {
  return {
    model: 'gemini-2.5-pro',
    phase: 'question-extraction',
    label: 'test',
    inputTokens: partial.totalTokens,
    outputTokens: 0,
    wallTimeMs: 1000,
    status: 'ok',
    retryCount: 0,
    ...partial,
  }
}

const peak = computePeakTpm([
  record({ timestamp: '2026-06-08T10:00:00.000Z', totalTokens: 40_000 }),
  record({ timestamp: '2026-06-08T10:00:30.000Z', totalTokens: 50_000 }),
  record({ timestamp: '2026-06-08T10:01:30.000Z', totalTokens: 10_000 }),
])
assert.equal(peak, 90_000, '60s window should sum overlapping calls')

const rec = recommendConcurrency('structured', 80_000, 2_000_000)
assert.equal(rec.theoreticalMaxConcurrency, 25)
assert.equal(rec.recommendedConcurrency, 16)

console.log('throughput-baseline.test.ts: ok')
