import assert from 'node:assert/strict'
import { CHECKIN_MIN_GAP_MS, decideCheckin, decideCheckinWindow } from '@/lib/plan/checkin-eligibility'
import { FORBIDDEN_NUDGE_WORDS } from '@/lib/plan/roadmap-types'
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

// --- roadmap rules: reminder time, quiet hours, backoff, the studied line ---
{
  // 08:00 in Karachi is 03:00Z. With reminder_time 08:00 the window is 07:30–11:00.
  const withReminder = { ...base, reminderTime: '08:00' }
  assert.ok(decideCheckin({ ...withReminder, now: new Date('2026-09-17T02:30:00Z') }).send, '07:30 local opens the window')
  assert.deepEqual(decideCheckin({ ...withReminder, now: new Date('2026-09-17T02:29:00Z') }), { send: false, reason: 'not_morning' })
  assert.ok(decideCheckin({ ...withReminder, now: new Date('2026-09-17T05:59:00Z') }).send, '10:59 local still counts')
  assert.deepEqual(decideCheckin({ ...withReminder, now: new Date('2026-09-17T06:00:00Z') }), { send: false, reason: 'not_morning' })

  // An evening reminder moves the whole window: 20:00 local is 15:00Z, outside the legacy hours.
  const evening = { ...base, reminderTime: '20:00', now: new Date('2026-09-17T15:00:00Z') }
  assert.ok(decideCheckin(evening).send, 'the legacy morning hours no longer apply')

  // Quiet hours that cross midnight: 21:30–07:30 covers 07:29 local but not 07:30.
  const quiet = { start: '21:30', end: '07:30' }
  assert.deepEqual(
    decideCheckin({ ...base, reminderTime: '07:00', quietHours: quiet, now: new Date('2026-09-17T02:29:00Z') }),
    { send: false, reason: 'quiet_hours' }
  )
  assert.ok(decideCheckin({ ...base, reminderTime: '07:00', quietHours: quiet, now: new Date('2026-09-17T02:30:00Z') }).send)

  // Backoff: three unopened check-ins means every other day.
  const yesterday = new Date(morning17.getTime() - 24 * 3600_000).toISOString()
  assert.ok(decideCheckin({ ...base, unopened: 2, lastSentAt: yesterday }).send, 'two unopened: still daily')
  assert.deepEqual(decideCheckin({ ...base, unopened: 3, lastSentAt: yesterday }), { send: false, reason: 'backoff' })
  const twoDaysAgo = new Date(morning17.getTime() - 48 * 3600_000).toISOString()
  assert.ok(decideCheckin({ ...base, unopened: 3, lastSentAt: twoDaysAgo }).send, 'three unopened: two days is fine')
  const sixDaysAgo = new Date(morning17.getTime() - 6 * 24 * 3600_000).toISOString()
  assert.deepEqual(decideCheckin({ ...base, unopened: 6, lastSentAt: sixDaysAgo }), { send: false, reason: 'backoff' })
  assert.ok(decideCheckin({ ...base, unopened: 6, lastSentAt: new Date(morning17.getTime() - 7 * 24 * 3600_000).toISOString() }).send)

  // The studied line is a fact, and the whole decision is free of the banned words.
  const d = decideCheckin({ ...base, done: { '1': true } })
  assert.ok(d.send)
  if (d.send) {
    assert.equal(d.studiedLine, "You've studied on 1 of the last 1 day.")
    for (const word of FORBIDDEN_NUDGE_WORDS) {
      assert.ok(!d.line.toLowerCase().includes(word), `line must not say "${word}": ${d.line}`)
      assert.ok(!d.studiedLine.toLowerCase().includes(word), `studied line must not say "${word}"`)
    }
  }
  const first = decideCheckin({ ...base, now: new Date('2026-09-16T02:30:00Z') })
  assert.ok(first.send)
  if (first.send) assert.equal(first.studiedLine, 'Day one. Everything starts today.')

  // An exam day with work on it (another subject's review after the paper) still sends.
  const examPlan = {
    ...plan,
    days: [...plan.days.slice(0, 1), { ...day(2, '2026-09-17', 'exam', 25, 4) }, ...plan.days.slice(2)],
  }
  assert.ok(decideCheckin({ ...base, plan: examPlan }).send, 'exam day with work sends')
  const quietExam = { ...examPlan, days: [...plan.days.slice(0, 1), { ...day(2, '2026-09-17', 'exam', 0, 4) }, ...plan.days.slice(2)] }
  assert.deepEqual(decideCheckin({ ...base, plan: quietExam }), { send: false, reason: 'rest_day' })

  // The cheap first pass agrees with the full decision on everything it can see.
  const w = decideCheckinWindow({ examDate: plan.examDate, timeZone: plan.timeZone, consent: true, lastSentAt: null, now: morning17 })
  assert.deepEqual(w, { open: true, todayIso: '2026-09-17' })
  assert.deepEqual(
    decideCheckinWindow({ examDate: plan.examDate, timeZone: plan.timeZone, consent: true, lastSentAt: null, quietHours: quiet, now: new Date('2026-09-17T02:00:00Z') }),
    { open: false, reason: 'quiet_hours' }
  )
}

console.log('checkin.test.ts: ok')
