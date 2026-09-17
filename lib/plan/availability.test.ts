import assert from 'node:assert/strict'
import {
  dayCapacity,
  dayFreeIntervals,
  deriveMinutesPerDay,
  deriveWeekAvailability,
  isClockTime,
  isWeekendDate,
  layoutDay,
  mergeIntervals,
  minuteOfDayInZone,
  normaliseSpan,
  reservePaperSlot,
  subtractIntervals,
  zonedInstant,
  type Interval,
} from '@/lib/plan/availability'
import { DEFAULT_AVAILABILITY, MIN_BUFFER_MINUTES, type Commitment, type RoadmapAvailability } from '@/lib/plan/roadmap-types'

const h = (hh: number, mm = 0) => hh * 60 + mm

function avail(over: Partial<RoadmapAvailability> = {}): RoadmapAvailability {
  return { ...DEFAULT_AVAILABILITY, commitments: [], noStudy: [], ...over }
}

function commitment(days: Commitment['days'], start: string, end: string): Commitment {
  return { id: 'c', label: 'Tuition', kind: 'tuition', days, start, end }
}

function assertClean(list: Interval[], what: string) {
  for (let i = 0; i < list.length; i++) {
    const cur = list[i]!
    assert.ok(cur.end - cur.start >= 1, `${what}: piece ${i} is at least a minute`)
    assert.ok(cur.start >= 0 && cur.end <= 1440, `${what}: piece ${i} inside the day`)
    if (i > 0) assert.ok(list[i - 1]!.end <= cur.start, `${what}: sorted and disjoint at ${i}`)
  }
}

// Monday..Sunday of one week.
const MON = '2026-09-14'
const TUE = '2026-09-15'
const SAT = '2026-09-19'
const NONE = new Set<string>()

// --- clock and spans ---------------------------------------------------------------------------

assert.equal(isClockTime('00:00'), true)
assert.equal(isClockTime('23:59'), true)
assert.equal(isClockTime('24:00'), false)
assert.equal(isClockTime('9:00'), false)
assert.equal(isClockTime('12:60'), false)
assert.equal(isClockTime(900), false)

assert.deepEqual(normaliseSpan({ start: '16:00', end: '18:00' }, { allowCross: false }), {
  sameDay: [{ start: h(16), end: h(18) }],
  nextDay: [],
})
assert.deepEqual(normaliseSpan({ start: '22:30', end: '07:00' }, { allowCross: true }), {
  sameDay: [{ start: h(22, 30), end: 1440 }],
  nextDay: [{ start: 0, end: h(7) }],
})
assert.deepEqual(normaliseSpan({ start: '22:30', end: '07:00' }, { allowCross: false }), { sameDay: [], nextDay: [] }, 'a window may not cross')
assert.deepEqual(normaliseSpan({ start: '10:00', end: '10:00' }, { allowCross: true }), { sameDay: [], nextDay: [] }, 'equal is empty')
assert.deepEqual(normaliseSpan({ start: '10:00', end: '25:00' }, { allowCross: true }), { sameDay: [], nextDay: [] }, 'invalid is empty')

assert.deepEqual(mergeIntervals([{ start: 60, end: 120 }, { start: 0, end: 60 }, { start: 100, end: 110 }, { start: 200, end: 200 }]), [
  { start: 0, end: 120 },
])
assert.deepEqual(subtractIntervals([{ start: 0, end: 100 }], [{ start: 20, end: 30 }, { start: 90, end: 200 }]), [
  { start: 0, end: 20 },
  { start: 30, end: 90 },
])
assert.deepEqual(subtractIntervals([{ start: 0, end: 100 }], [{ start: 0, end: 100 }]), [])
assert.deepEqual(subtractIntervals([{ start: 0, end: 100 }], []), [{ start: 0, end: 100 }])

assert.equal(isWeekendDate(SAT), true)
assert.equal(isWeekendDate(MON), false)

// --- capacity ------------------------------------------------------------------------------------

{
  // weekday 90 / weekend 150 / no commitments → Saturday capacity 150, not 90.
  const a = avail()
  assert.equal(dayCapacity(SAT, a, NONE, []).capacity, 150)
  assert.equal(dayCapacity(MON, a, NONE, []).capacity, 90)
  assert.deepEqual(deriveWeekAvailability(a), [90, 90, 90, 90, 90, 150, 150])
  assert.equal(deriveMinutesPerDay(a), 150)
  assert.equal(deriveMinutesPerDay(avail({ weekdayMinutes: 0, weekendMinutes: 0 })), 10, 'never below the floor')
}

{
  // Tuesday commitment 17:00–19:00 inside a 16:00–21:00 window → min(90, 180) = 90: no double subtraction.
  const a = avail({ commitments: [commitment([1], '17:00', '19:00')] })
  const cap = dayCapacity(TUE, a, NONE, [])
  assert.deepEqual(cap.intervals, [{ start: h(16), end: h(17) }, { start: h(19), end: h(21) }])
  assert.equal(cap.raw, 180)
  assert.equal(cap.capacity, 90)
  assert.deepEqual(cap.commitments, [{ label: 'Tuition', start: '17:00', end: '19:00', kind: 'tuition' }])
  assert.equal(dayCapacity(MON, a, NONE, []).commitments.length, 0, 'not on Monday')
}

{
  // Window 16:00–18:00 with the same commitment → 60.
  const a = avail({
    windows: { weekday: [{ start: '16:00', end: '18:00' }], weekend: [] },
    commitments: [commitment([1], '17:00', '19:00')],
  })
  assert.equal(dayCapacity(TUE, a, NONE, []).capacity, 60)
}

{
  // Monday commitment 22:00–02:00: Monday ends by 22:00, Tuesday starts no earlier than 02:00.
  const a = avail({
    windows: { weekday: [{ start: '00:00', end: '23:59' }], weekend: [] },
    commitments: [commitment([0], '22:00', '02:00')],
  })
  const mon = dayFreeIntervals(MON, a)
  const tue = dayFreeIntervals(TUE, a)
  assertClean(mon, 'monday')
  assertClean(tue, 'tuesday')
  assert.ok(mon.every((i) => i.end <= h(22)))
  assert.ok(tue.every((i) => i.start >= h(2)))
  assert.equal(dayFreeIntervals('2026-09-16', a)[0]!.start, 0, 'Wednesday is untouched')
}

{
  // noStudy 22:30–07:00 removes both ends of every day.
  const a = avail({
    windows: { weekday: [{ start: '00:00', end: '23:59' }], weekend: [{ start: '00:00', end: '23:59' }] },
    noStudy: [{ start: '22:30', end: '07:00' }],
  })
  for (const d of [MON, TUE, SAT]) {
    const free = dayFreeIntervals(d, a)
    assertClean(free, d)
    assert.deepEqual(free, [{ start: h(7), end: h(22, 30) }])
  }
}

{
  // A window with end <= start is ignored; the other window stands.
  const a = avail({ windows: { weekday: [{ start: '20:00', end: '18:00' }, { start: '09:00', end: '10:00' }], weekend: [] } })
  assert.deepEqual(dayFreeIntervals(MON, a), [{ start: h(9), end: h(10) }])
  assert.deepEqual(dayFreeIntervals(MON, avail({ windows: { weekday: [{ start: '10:00', end: '10:00' }], weekend: [] } })), [])
}

{
  // Blocked date → capacity 0, no intervals, commitments still listed for the timeline.
  const a = avail({ commitments: [commitment([0], '17:00', '18:00')] })
  const cap = dayCapacity(MON, a, new Set([MON]), [])
  assert.equal(cap.capacity, 0)
  assert.deepEqual(cap.intervals, [])
  assert.equal(cap.stated, 90)
  assert.equal(cap.commitments.length, 1)
}

{
  // Exams are commitments on their date: from midnight to examTime + paper + 60, or until 18:00 without a time.
  const a = avail({ windows: { weekday: [{ start: '08:00', end: '21:00' }], weekend: [] }, weekdayMinutes: 600 })
  const timed = dayCapacity(MON, a, NONE, [{ date: MON, label: 'Maths P1', examTime: '09:00', paperMinutes: 120 }])
  assert.deepEqual(timed.intervals, [{ start: h(12), end: h(21) }])
  assert.deepEqual(timed.commitments, [{ label: 'Maths P1', start: '00:00', end: '12:00', kind: 'exam' }])
  const untimed = dayCapacity(MON, a, NONE, [{ date: MON, label: 'Maths P1' }])
  assert.deepEqual(untimed.intervals, [{ start: h(18), end: h(21) }])
  const noPaper = dayCapacity(MON, a, NONE, [{ date: MON, label: 'Maths P1', examTime: '09:00' }])
  assert.deepEqual(noPaper.intervals, [{ start: h(11, 30), end: h(21) }], '90-minute paper assumed')
  assert.equal(dayCapacity(TUE, a, NONE, [{ date: MON, label: 'Maths P1' }]).commitments.length, 0, 'other dates unaffected')
}

{
  // Every returned interval list is sorted, disjoint and at least a minute each.
  const a = avail({
    windows: {
      weekday: [{ start: '16:00', end: '21:00' }, { start: '07:00', end: '08:00' }, { start: '20:30', end: '22:00' }],
      weekend: [],
    },
    commitments: [commitment([0, 1, 2, 3, 4], '07:59', '08:30'), commitment([0], '20:59', '21:00')],
    noStudy: [{ start: '21:30', end: '07:30' }],
  })
  for (const d of [MON, TUE]) assertClean(dayFreeIntervals(d, a), d)
  assert.deepEqual(dayFreeIntervals(MON, a), [{ start: h(7, 30), end: h(7, 59) }, { start: h(16), end: h(20, 59) }, { start: h(21), end: h(21, 30) }])
}

// --- layout --------------------------------------------------------------------------------------

{
  // capacity 90, one interval 16:00–17:30, session 20, rhythm 'short' → work [20,20,20], breaks [5,5]; Σ 70 <= 72.
  const layout = layoutDay([{ start: h(16), end: h(17, 30) }], 90, 20, 'short')
  assert.deepEqual(layout.slots.filter((s) => s.kind === 'work').map((s) => s.minutes), [20, 20, 20])
  assert.deepEqual(layout.slots.filter((s) => s.kind === 'break').map((s) => s.minutes), [5, 5])
  assert.equal(layout.workMinutes, 60)
  assert.equal(layout.breakMinutes, 10)
  // Time in hand is capacity − work − breaks: 90 − 60 − 10.
  assert.equal(layout.bufferMinutes, 20)
  const buffer = layout.slots.filter((s) => s.kind === 'buffer')
  assert.equal(buffer.length, 1)
  assert.deepEqual(buffer[0], { kind: 'buffer', start: h(17, 10), end: h(17, 30), minutes: 20 })
  assert.deepEqual(layout.slots.map((s) => s.kind), ['work', 'break', 'work', 'break', 'work', 'buffer'])
  assert.equal(layout.slots[0]!.start, h(16))
  assert.equal(layout.slots[4]!.end, h(17, 10))
}

{
  // capacity 60, session 60, 'standard' → one 48-minute work slot, buffer 12.
  const layout = layoutDay([{ start: h(10), end: h(11) }], 60, 60, 'standard')
  assert.deepEqual(layout.slots.filter((s) => s.kind === 'work').map((s) => s.minutes), [48])
  assert.equal(layout.breakMinutes, 0)
  assert.equal(layout.bufferMinutes, 12)
  assert.deepEqual(layout.slots.filter((s) => s.kind === 'buffer'), [{ kind: 'buffer', start: h(10, 48), end: h(11), minutes: 12 }])
}

{
  // Intervals 15 + 15 + 10 (capacity 40, session 20, minTask 10): no slot straddles, no break at an edge,
  // and the third interval stays in hand — laying it would take the day to 100%, past UTILISATION_MAX.
  const intervals = [{ start: h(9), end: h(9, 15) }, { start: h(10), end: h(10, 15) }, { start: h(11), end: h(11, 10) }]
  const layout = layoutDay(intervals, 40, 20, 'standard', undefined, 10)
  const work = layout.slots.filter((s) => s.kind === 'work')
  assert.ok(work.length >= 1 && work.length <= 3)
  assert.ok(layout.workMinutes + layout.breakMinutes <= Math.floor(40 * 0.85))
  for (const s of layout.slots) {
    assert.ok(intervals.some((i) => s.start >= i.start && s.end <= i.end), `slot ${s.start}-${s.end} inside one interval`)
    assert.equal(s.minutes, s.end - s.start)
  }
  for (const s of layout.slots.filter((x) => x.kind === 'break')) {
    assert.ok(!intervals.some((i) => s.start === i.start || s.end === i.end), 'no break at an interval edge')
  }
  assert.deepEqual(work.map((s) => s.minutes), [15, 15])
  assert.equal(layout.breakMinutes, 0)
  assert.equal(layout.bufferMinutes, 10)
}

{
  // Long break after LONG_BREAK_AFTER[session] slots, inside one long interval; the last slot rounds the budget.
  const layout = layoutDay([{ start: h(9), end: h(13) }], 240, 40, 'standard')
  const kinds = layout.slots.map((s) => `${s.kind}:${s.minutes}`)
  // Budget 192: 40, 5, 40, 15, 40, 5, 40 = 185; the long break due next (15 → 200) does not fit, so it degrades
  // to a short one and the last slot rounds the budget (195, under the 204 ceiling) rather than ending the day at 185.
  assert.deepEqual(kinds, ['work:40', 'break:5', 'work:40', 'break:15', 'work:40', 'break:5', 'work:40', 'break:5', 'work:10', 'buffer:40'])
  assert.equal(layout.workMinutes, 170)
  assert.equal(layout.breakMinutes, 30)
  assert.equal(layout.bufferMinutes, 40)
  assert.ok(layout.workMinutes + layout.breakMinutes <= 192 + 10)
}

{
  // A slot shorter than minTask is dropped; a remainder under MIN_BUFFER_MINUTES is counted but not shown.
  const layout = layoutDay([{ start: h(9), end: h(9, 25) }], 25, 20, 'standard')
  assert.deepEqual(layout.slots.filter((s) => s.kind === 'work').map((s) => s.minutes), [20])
  assert.equal(layout.bufferMinutes, 5)
  assert.ok(layout.bufferMinutes < MIN_BUFFER_MINUTES)
  assert.equal(layout.slots.filter((s) => s.kind === 'buffer').length, 0)
  const tiny = layoutDay([{ start: h(9), end: h(9, 8) }], 8, 20, 'standard')
  assert.equal(tiny.workMinutes, 0)
  assert.equal(tiny.slots.length, 0)
}

{
  // Empty intervals → everything 0.
  assert.deepEqual(layoutDay([], 90, 40, 'standard'), { slots: [], workMinutes: 0, breakMinutes: 0, bufferMinutes: 0 })
  assert.deepEqual(layoutDay([{ start: h(9), end: h(10) }], 0, 40, 'standard'), { slots: [], workMinutes: 0, breakMinutes: 0, bufferMinutes: 0 })
}

{
  // Utilisation is respected: Σ(work + breaks) never beyond utilisation × capacity + minTask.
  for (const cap of [30, 45, 60, 75, 90, 120, 150, 180]) {
    for (const session of [20, 40, 60] as const) {
      const layout = layoutDay([{ start: h(9), end: h(9) + cap }], cap, session, 'generous')
      assert.ok(layout.workMinutes + layout.breakMinutes <= Math.floor(cap * 0.8) + 10, `cap ${cap} session ${session}`)
      assert.equal(layout.bufferMinutes, cap - layout.workMinutes - layout.breakMinutes)
      const slots = layout.slots
      for (let i = 1; i < slots.length; i++) assert.ok(slots[i]!.start >= slots[i - 1]!.end, 'slots in order')
    }
  }
}

{
  const free = [{ start: h(9), end: h(9, 30) }, { start: h(10), end: h(12) }]
  const paper = reservePaperSlot(free, 60)
  assert.deepEqual(paper, { slot: { start: h(10), end: h(11) }, rest: [{ start: h(9), end: h(9, 30) }, { start: h(11), end: h(12) }] })
  assert.equal(reservePaperSlot(free, 150), null)
  assert.equal(reservePaperSlot([], 30), null)
}

// --- zones ----------------------------------------------------------------------------------------

assert.equal(zonedInstant('2027-03-14', '02:30', 'America/New_York').toISOString(), '2027-03-14T07:30:00.000Z', 'spring-forward gap resolves forward')
assert.equal(zonedInstant('2026-11-01', '01:30', 'America/New_York').toISOString(), '2026-11-01T05:30:00.000Z', 'fall-back picks the earlier instant')
assert.equal(zonedInstant('2026-09-17', '08:00', 'Asia/Karachi').toISOString(), '2026-09-17T03:00:00.000Z')
assert.equal(zonedInstant('2026-09-17', '08:00', 'Europe/London').toISOString(), '2026-09-17T07:00:00.000Z')
assert.equal(zonedInstant('2026-09-17', '08:00', 'Not/AZone').toISOString(), '2026-09-17T08:00:00.000Z', 'unknown zone reads as UTC')
assert.equal(zonedInstant('2026-09-17', '00:00', 'Pacific/Auckland').toISOString(), '2026-09-16T12:00:00.000Z')

assert.equal(minuteOfDayInZone('Asia/Karachi', new Date('2026-09-17T03:05:00Z')), 8 * 60 + 5)
assert.equal(minuteOfDayInZone('America/New_York', new Date('2026-09-17T03:05:00Z')), 23 * 60 + 5)
assert.equal(minuteOfDayInZone('Not/AZone', new Date('2026-09-17T03:05:00Z')), 3 * 60 + 5)

console.log('availability.test.ts: ok')
