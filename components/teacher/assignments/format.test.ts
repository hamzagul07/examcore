import assert from 'node:assert/strict'
import {
  FALLBACK_TIME_ZONE,
  addLocalDays,
  defaultDueChips,
  extensionChips,
  formatClock,
  formatDate,
  formatDueAbsolute,
  formatDueLong,
  formatDueShort,
  formatWeekRange,
  fromLocalInputValue,
  isPast,
  nextWeekdayAt,
  safeTimeZone,
  sameMinute,
  toLocalInputValue,
  wallClock,
} from '@/components/teacher/assignments/format'

// --- time zones ---------------------------------------------------------------

assert.equal(safeTimeZone('Europe/London'), 'Europe/London')
assert.equal(safeTimeZone(' America/New_York '), 'America/New_York')
assert.ok(safeTimeZone('Asia/Kolkata'), 'ICU may canonicalise the spelling, but the zone is accepted')
assert.equal(safeTimeZone('UTC'), 'UTC')
for (const bad of ['', 'Mars/Olympus', 'Europe/London; drop', '<script>', null, 42, 'x'.repeat(80)]) {
  assert.equal(safeTimeZone(bad), null, `rejects ${String(bad)}`)
}
assert.equal(FALLBACK_TIME_ZONE, 'UTC')

// --- clock --------------------------------------------------------------------

assert.equal(formatClock(16, 0), '4pm')
assert.equal(formatClock(9, 0), '9am')
assert.equal(formatClock(16, 30), '4:30pm')
assert.equal(formatClock(12, 0), '12pm', 'noon')
assert.equal(formatClock(0, 5), '12:05am', 'just after midnight')

// --- the teacher's zone, not the server's ---------------------------------------

// 15:00 UTC on Friday 2 October 2026 is 4pm in London (BST) and 8:30pm in Kolkata.
const DUE = '2026-10-02T15:00:00.000Z'
const MON = Date.parse('2026-09-28T08:00:00.000Z') // Monday morning, same week

assert.deepEqual(
  { ...wallClock(Date.parse(DUE), 'Europe/London') },
  { year: 2026, month: 10, day: 2, weekday: 5, hour: 16, minute: 0 }
)
assert.equal(wallClock(Date.parse(DUE), 'not/a-zone').hour, 15, 'an unusable zone reads as UTC')

assert.equal(formatDueShort(DUE, { timeZone: 'Europe/London', now: MON }), 'Fri 4pm')
assert.equal(formatDueShort(DUE, { timeZone: 'UTC', now: MON }), 'Fri 3pm')
assert.equal(formatDueShort(DUE, { timeZone: 'Asia/Kolkata', now: MON }), 'Fri 8:30pm')

const THU = Date.parse('2026-10-01T10:00:00.000Z')
assert.equal(formatDueShort(DUE, { timeZone: 'Europe/London', now: THU }), 'Tomorrow 4pm')
assert.equal(formatDueShort(DUE, { timeZone: 'Europe/London', now: Date.parse(DUE) - 3600_000 }), 'Today 4pm')
assert.equal(
  formatDueShort(DUE, { timeZone: 'Europe/London', now: Date.parse('2026-10-03T09:00:00Z') }),
  'Yesterday 4pm'
)
assert.equal(
  formatDueShort(DUE, { timeZone: 'Europe/London', now: Date.parse('2026-09-20T09:00:00Z') }),
  'Fri 2 Oct, 4pm',
  'more than a week out gets its date'
)
assert.equal(
  formatDueShort(DUE, { timeZone: 'Europe/London', now: Date.parse('2026-10-09T09:00:00Z') }),
  'Fri 2 Oct, 4pm',
  'a week ago gets its date'
)
assert.equal(
  formatDueShort('2027-01-08T16:00:00Z', { timeZone: 'Europe/London', now: Date.parse('2026-12-20T09:00:00Z') }),
  'Fri 8 Jan 2027, 4pm',
  'another year is spelled out'
)
// Around midnight the calendar day is the teacher's, not UTC's.
assert.equal(
  formatDueShort('2026-10-02T23:30:00Z', { timeZone: 'Europe/London', now: Date.parse('2026-10-02T12:00:00Z') }),
  'Tomorrow 12:30am'
)
assert.equal(formatDueShort(null, { timeZone: 'UTC', now: MON }), null)
assert.equal(formatDueShort('not a date', { timeZone: 'UTC', now: MON }), null)

assert.equal(formatDueLong(DUE, 'Europe/London'), 'Friday 2 October 2026, 4pm')
assert.equal(formatDueAbsolute(DUE, 'Europe/London'), 'Fri 2 Oct 2026, 4pm')
assert.equal(formatDueShort(DUE, { timeZone: 'Europe/London', now: Number.NaN }), 'Fri 2 Oct 2026, 4pm', 'no agreed now: absolute')
assert.equal(formatDueLong(undefined, 'Europe/London'), null)
assert.equal(formatDate(DUE, 'Europe/London'), '2 Oct 2026')
assert.equal(formatDate('2026-10-02T23:30:00Z', 'Europe/London'), '3 Oct 2026')

// --- week ranges (UTC ISO weeks) --------------------------------------------------

assert.equal(formatWeekRange('2026-09-21T00:00:00.000Z', '2026-09-28T00:00:00.000Z'), '21–27 Sep')
assert.equal(formatWeekRange('2026-09-28T00:00:00.000Z', '2026-10-05T00:00:00.000Z'), '28 Sep – 4 Oct')
assert.equal(
  formatWeekRange('2025-12-29T00:00:00.000Z', '2026-01-05T00:00:00.000Z'),
  '29 Dec 2025 – 4 Jan 2026'
)
assert.equal(formatWeekRange('bad', '2026-01-05T00:00:00.000Z'), null)
assert.equal(formatWeekRange('2026-01-05T00:00:00.000Z', '2026-01-05T00:00:00.000Z'), null)

assert.equal(isPast(DUE, Date.parse(DUE) + 1), true)
assert.equal(isPast(DUE, Date.parse(DUE)), false, 'on the deadline is not past')
assert.equal(isPast(null, Date.now()), false, 'no deadline never passes')

// --- datetime-local round trip (runtime-local; assertions hold in any TZ) ----------

const local = new Date(2026, 9, 2, 16, 0, 0, 0)
assert.equal(toLocalInputValue(local), '2026-10-02T16:00')
assert.equal(fromLocalInputValue('2026-10-02T16:00')?.getTime(), local.getTime())
assert.equal(toLocalInputValue(fromLocalInputValue('2026-01-31T09:05')), '2026-01-31T09:05')
assert.equal(toLocalInputValue(null), '')
assert.equal(toLocalInputValue(new Date(Number.NaN)), '')
for (const bad of ['2026-02-30T09:00', '2026-13-01T09:00', '2026-10-02', '2026-10-02T24:00', 'soon', '']) {
  assert.equal(fromLocalInputValue(bad), null, `rejects ${bad}`)
}

// --- quick chips ------------------------------------------------------------------

const wedNoon = new Date(2026, 8, 30, 12, 0, 0, 0) // Wednesday 30 September 2026, local
assert.equal(wedNoon.getDay(), 3)
const fri = nextWeekdayAt(wedNoon, 5, 16)
assert.equal(fri.getDay(), 5)
assert.equal(fri.getHours(), 16)
assert.equal(fri.getDate(), 2, 'this coming Friday')
const mon = nextWeekdayAt(wedNoon, 1, 9)
assert.equal(mon.getDay(), 1)
assert.equal(mon.getDate(), 5)

const friAfternoon = new Date(2026, 9, 2, 15, 0, 0, 0)
const nextFri = nextWeekdayAt(friAfternoon, 5, 16)
assert.equal(nextFri.getDate(), 9, 'an hour away is too soon: next Friday')
const friMorning = new Date(2026, 9, 2, 3, 0, 0, 0)
assert.equal(nextWeekdayAt(friMorning, 5, 16).getDate(), 2, 'thirteen hours away is fine')

const chips = defaultDueChips(wedNoon)
assert.deepEqual(
  chips.map((c) => c.label),
  ['Fri 4pm', 'Mon 9am']
)
assert.ok(chips.every((c) => c.date.getTime() > wedNoon.getTime()))

const base = new Date(2026, 9, 2, 16, 0, 0, 0)
const ext = extensionChips(base)
assert.deepEqual(
  ext.map((c) => c.label),
  ['+1 day', '+3 days', '+1 week']
)
assert.deepEqual(
  ext.map((c) => [c.date.getDate(), c.date.getHours()]),
  [
    [3, 16],
    [5, 16],
    [9, 16],
  ],
  'extensions keep the wall-clock time'
)
// Across the October clock change the wall time holds, not the 24h count.
const beforeChange = new Date(2026, 9, 24, 16, 0, 0, 0)
assert.equal(addLocalDays(beforeChange, 7).getHours(), 16)

assert.equal(sameMinute('2026-10-02T15:00:00.000Z', new Date('2026-10-02T15:00:40.000Z')), true)
assert.equal(sameMinute('2026-10-02T15:00:00.000Z', '2026-10-02T15:01:00.000Z'), false)
assert.equal(sameMinute(null, '2026-10-02T15:00:00.000Z'), false)

console.log('format.test.ts — all assertions passed')
