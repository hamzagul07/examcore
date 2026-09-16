import assert from 'node:assert/strict'
import { CHECKIN_MIN_GAP_MS, decideCheckin } from '@/lib/plan/checkin-eligibility'
import type { HydratedDay } from '@/lib/plan/plan-view'

const day = (n: number, date: string, kind: HydratedDay['kind'], work: number, daysLeft: number): HydratedDay => ({
  day: n,
  date,
  daysLeft,
  kind,
  focus: '',
  workMinutes: work,
  blocks: work > 0 ? [{ kind: 'drill', minutes: work, label: 'x', href: '/mark' }] : [{ kind: 'rest', minutes: 0, label: 'Rest' }],
})

const plan = {
  examDate: '2026-09-21',
  days: [
    day(1, '2026-09-16', 'study', 50, 5),
    day(2, '2026-09-17', 'study', 50, 4),
    day(3, '2026-09-18', 'rest', 0, 3),
    day(4, '2026-09-19', 'review', 25, 2),
    day(5, '2026-09-20', 'review', 25, 1),
  ],
}
const now = new Date('2026-09-17T06:30:00Z')
const base = { plan, done: {}, todayIso: '2026-09-17', consent: true, lastSentAt: null, now }

{
  const d = decideCheckin(base)
  assert.ok(d.send)
  if (d.send) {
    assert.equal(d.day.day, 2)
    assert.ok(d.line.length > 0)
    assert.equal(d.progress.behind, 1, 'day 1 was not ticked')
  }
}
assert.deepEqual(decideCheckin({ ...base, consent: false }), { send: false, reason: 'no_consent' })
assert.deepEqual(decideCheckin({ ...base, todayIso: '2026-09-18' }), { send: false, reason: 'rest_day' })
assert.deepEqual(decideCheckin({ ...base, todayIso: '2026-09-21' }), { send: false, reason: 'exam_passed' })
assert.deepEqual(decideCheckin({ ...base, todayIso: '2026-09-15' }), { send: false, reason: 'no_day' })

// One a day, whatever the cron does.
assert.deepEqual(
  decideCheckin({ ...base, lastSentAt: new Date(now.getTime() - 3 * 3600_000).toISOString() }),
  { send: false, reason: 'recent' }
)
assert.ok(
  decideCheckin({ ...base, lastSentAt: new Date(now.getTime() - CHECKIN_MIN_GAP_MS - 1000).toISOString() }).send,
  'yesterday morning is long enough ago'
)
assert.ok(decideCheckin({ ...base, lastSentAt: 'not a date' }).send, 'a corrupt timestamp never blocks forever')

// Review days still get a (quieter) email; the night before says to stop.
{
  const d = decideCheckin({ ...base, todayIso: '2026-09-20' })
  assert.ok(d.send)
  if (d.send) assert.match(d.line, /sleep/i)
}

console.log('checkin.test.ts: ok')
