import assert from 'node:assert/strict'
import {
  QUEUE_KEY,
  TODAY_CACHE_TTL_MS,
  enqueue,
  mutationDays,
  readQueue,
  readTodayCache,
  spliceDays,
  writeQueue,
  writeTodayCache,
  clearTodayCache,
  type KV,
  type QueueItem,
} from '@/components/plan/roadmap-client'

function memory(): KV & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

// --- spliceDays ------------------------------------------------------------------

{
  const days = [
    { date: '2026-09-17', n: 1 },
    { date: '2026-09-18', n: 2 },
    { date: '2026-09-20', n: 4 },
  ]
  const out = spliceDays(days, [{ date: '2026-09-18', n: 22 }])
  assert.deepEqual(
    out.map((d) => d.n),
    [1, 22, 4],
    'replaces by date, in place'
  )
  assert.notEqual(out, days, 'returns a new array')
  assert.equal(days[1]!.n, 2, 'never mutates the input')
}
{
  const days = [{ date: '2026-09-17' }, { date: '2026-09-20' }]
  const out = spliceDays(days, [{ date: '2026-09-19' }, { date: '2026-09-21' }])
  assert.deepEqual(
    out.map((d) => d.date),
    ['2026-09-17', '2026-09-19', '2026-09-20', '2026-09-21'],
    'unknown dates are inserted in order'
  )
}
{
  const days = [{ date: '2026-09-17' }]
  assert.deepEqual(spliceDays(days, []), days, 'nothing incoming leaves the days alone')
}

// --- mutationDays ----------------------------------------------------------------

{
  const m = {
    date: '2026-09-17',
    day: { date: '2026-09-17' },
    taskState: {},
    revision: 3,
    otherDays: [{ date: '2026-09-18', day: { date: '2026-09-18' } }],
  }
  assert.deepEqual(
    mutationDays(m).map((d) => d.date),
    ['2026-09-17', '2026-09-18']
  )
  assert.deepEqual(mutationDays({ ...m, otherDays: undefined }).map((d) => d.date), ['2026-09-17'])
}

// --- the retry queue ------------------------------------------------------------

{
  const kv = memory()
  assert.deepEqual(readQueue(kv), [], 'empty when nothing stored')
  kv.setItem(QUEUE_KEY, 'not json')
  assert.deepEqual(readQueue(kv), [], 'garbage reads as empty')
  kv.setItem(QUEUE_KEY, JSON.stringify([{ id: 'a', kind: 'task', body: { taskId: 't', action: 'complete', revision: 1, nowMinute: 600 }, at: 'x' }, { nope: true }]))
  assert.equal(readQueue(kv).length, 1, 'malformed entries are dropped')
}
{
  const kv = memory()
  const item: QueueItem = {
    id: 'a',
    kind: 'task',
    body: { taskId: 't1', action: 'complete', revision: 1, nowMinute: 600 },
    at: '2026-09-17T10:00:00Z',
  }
  enqueue(item, kv)
  enqueue({ ...item, id: 'b', body: { ...item.body, revision: 2 } }, kv)
  assert.equal(readQueue(kv).length, 1, 'the same action queued twice (any revision) is one entry')
  enqueue({ ...item, id: 'c', body: { ...item.body, taskId: 't2' } }, kv)
  assert.equal(readQueue(kv).length, 2, 'a different task is a second entry')
  writeQueue([], kv)
  assert.equal(kv.getItem(QUEUE_KEY), null, 'an empty queue removes the key')
}

// --- today cache ------------------------------------------------------------------

{
  const kv = memory()
  const now = new Date('2026-09-17T10:00:00Z')
  assert.equal(readTodayCache(kv, now), null)
  writeTodayCache({ hasPlan: true, dayNumber: 3 }, kv, now)
  assert.equal(readTodayCache(kv, now)?.dayNumber, 3, 'round-trips')
  assert.equal(readTodayCache(kv, new Date(now.getTime() + TODAY_CACHE_TTL_MS + 1)), null, 'expires after ten minutes')
  assert.equal(readTodayCache(kv, new Date('2026-09-18T10:00:00Z')), null, 'keyed by date')
  clearTodayCache(kv, now)
  assert.equal(readTodayCache(kv, now), null, 'cleared after a mutation')
}

console.log('components/plan/roadmap-client.test.ts: ok')
