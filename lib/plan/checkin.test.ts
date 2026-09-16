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

// A Karachi student (UTC+5). 07:30 local on the 17th is 02:30Z.
const plan = {
  examDate: '2026-09-21',
  timeZone: 'Asia/Karachi',
  days: [
    day(1, '2026-09-16', 'study', 50, 5),
    day(2, '2026-09-17', 'study', 50, 4),
    day(3, '2026-09-18', 'rest', 0, 3),
    day(4, '2026-09-19', 'review', 25, 2),
    day(5, '2026-09-20', 'review', 25, 1),
  ],
}
const morning17 = new Date('2026-09-17T02:30:00Z')
const base = { plan, done: {}, consent: true, lastSentAt: null, now: morning17 }

{
  const d = decideCheckin(base)
  assert.ok(d.send)
  if (d.send) {
    assert.equal(d.todayIso, '2026-09-17', "today is the student's date")
    assert.equal(d.day.day, 2)
    assert.ok(d.line.length > 0)
    assert.equal(d.progress.behind, 1, 'day 1 was not ticked')
  }
}
assert.deepEqual(decideCheckin({ ...base, consent: false }), { send: false, reason: 'no_consent' })

// The morning window is local. 20:30Z on the 16th is 01:30 on the 17th in
// Karachi — right date, wrong hour. 10:00Z is 15:00 — afternoon.
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-16T20:30:00Z') }), { send: false, reason: 'not_morning' })
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-17T10:00:00Z') }), { send: false, reason: 'not_morning' })
assert.ok(decideCheckin({ ...base, now: new Date('2026-09-17T05:59:00Z') }).send, '10:59 local still counts')
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-17T06:00:00Z') }), { send: false, reason: 'not_morning' })

// Rest day (the 18th, 07:30 local = 02:30Z), exam passed, before the plan.
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-18T02:30:00Z') }), { send: false, reason: 'rest_day' })
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-21T02:30:00Z') }), { send: false, reason: 'exam_passed' })
assert.deepEqual(decideCheckin({ ...base, now: new Date('2026-09-15T02:30:00Z') }), { send: false, reason: 'no_day' })

// One a day, whatever the cron does.
assert.deepEqual(
  decideCheckin({ ...base, lastSentAt: new Date(morning17.getTime() - 3 * 3600_000).toISOString() }),
  { send: false, reason: 'recent' }
)
assert.ok(
  decideCheckin({ ...base, lastSentAt: new Date(morning17.getTime() - CHECKIN_MIN_GAP_MS - 1000).toISOString() }).send,
  'yesterday morning is long enough ago'
)
assert.ok(decideCheckin({ ...base, lastSentAt: 'not a date' }).send, 'a corrupt timestamp never blocks forever')

// Review days still get a (quieter) email; the night before says to stop.
{
  const d = decideCheckin({ ...base, now: new Date('2026-09-20T02:30:00Z') })
  assert.ok(d.send)
  if (d.send) assert.match(d.line, /sleep/i)
}

// A plan with no zone (built before zones were stored) reads as UTC.
{
  const utcPlan = { ...plan, timeZone: undefined }
  assert.ok(decideCheckin({ ...base, plan: utcPlan, now: new Date('2026-09-17T07:30:00Z') }).send)
  assert.deepEqual(
    decideCheckin({ ...base, plan: utcPlan, now: new Date('2026-09-17T02:30:00Z') }),
    { send: false, reason: 'not_morning' }
  )
}

// Los Angeles (UTC-7 in September): 07:30 local on the 17th is 14:30Z.
{
  const la = { ...plan, timeZone: 'America/Los_Angeles' }
  const d = decideCheckin({ ...base, plan: la, now: new Date('2026-09-17T14:30:00Z') })
  assert.ok(d.send)
  if (d.send) assert.equal(d.todayIso, '2026-09-17')
}

console.log('checkin.test.ts: ok')
