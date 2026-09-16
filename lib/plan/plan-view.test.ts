import assert from 'node:assert/strict'
import {
  blockEvidenceKey,
  carryOverDone,
  checkinLine,
  doneStreak,
  examSchedule,
  nextBlock,
  planWeeks,
  findPlanDay,
  markedBlocks,
  formatMinutes,
  formatPlanDate,
  hourInZone,
  isValidTimeZone,
  isoDate,
  planProgress,
  todayInZone,
  workBlocks,
  type HydratedDay,
} from '@/lib/plan/plan-view'

const day = (n: number, date: string, kind: HydratedDay['kind'], work: number, daysLeft = 10): HydratedDay => ({
  day: n,
  date,
  daysLeft,
  kind,
  focus: '',
  workMinutes: work,
  blocks:
    work > 0
      ? [
          { kind: 'drill', minutes: 25, label: 'a' },
          { kind: 'break', minutes: 5, label: '5 min off' },
          { kind: 'drill', minutes: 25, label: 'b' },
        ]
      : [{ kind: 'rest', minutes: 0, label: 'Rest' }],
})

const plan = {
  days: [
    day(1, '2026-09-16', 'study', 50),
    day(2, '2026-09-17', 'study', 50),
    day(3, '2026-09-18', 'rest', 0),
    day(4, '2026-09-19', 'study', 50),
    day(5, '2026-09-20', 'review', 25, 1),
  ],
}

assert.equal(findPlanDay(plan, '2026-09-18')?.day, 3)
assert.equal(findPlanDay(plan, '2026-09-21'), null, 'exam day is not a plan day')
assert.equal(findPlanDay(plan, '2026-09-15'), null, 'before the plan started')

{
  // Two work days behind us (day 1 done, day 2 not); rest day never counts.
  const p = planProgress(plan, { '1': true }, '2026-09-19')
  assert.deepEqual(p, { scheduled: 2, done: 1, behind: 1, totalWorkDays: 4, totalDone: 1 })
}
{
  const p = planProgress(plan, {}, '2026-09-16')
  assert.deepEqual(p, { scheduled: 0, done: 0, behind: 0, totalWorkDays: 4, totalDone: 0 })
}
{
  // Ticking a future day counts toward the total, not toward "behind".
  const p = planProgress(plan, { '4': true }, '2026-09-17')
  assert.equal(p.totalDone, 1)
  assert.equal(p.scheduled, 1)
  assert.equal(p.behind, 1)
}

assert.deepEqual(
  examSchedule({ subjects: [{ code: 'a', label: 'Physics', examDate: '2026-10-05' }, { code: 'b', label: 'Maths', examDate: '2026-09-25' }, { code: 'c', label: 'Chemistry', examDate: '2026-10-05' }] }),
  [{ date: '2026-09-25', labels: ['Maths'] }, { date: '2026-10-05', labels: ['Physics', 'Chemistry'] }]
)
assert.match(checkinLine(day(3, '2026-09-25', 'exam', 0), { scheduled: 0, done: 0, behind: 0, totalWorkDays: 0, totalDone: 0 }), /Exam day/)

// Streak: ticked work days in a row; rest days pass through; today unticked is not a miss yet.
{
  const p = { days: [day(1, '2026-09-16', 'study', 50), day(2, '2026-09-17', 'study', 50), day(3, '2026-09-18', 'rest', 0), day(4, '2026-09-19', 'study', 50), day(5, '2026-09-20', 'study', 50)] }
  assert.equal(doneStreak(p, { '1': true, '2': true, '4': true }, '2026-09-19'), 3, 'rest day in the middle does not break it')
  assert.equal(doneStreak(p, { '1': true, '2': true, '4': true }, '2026-09-20'), 3, 'today unticked yet: streak stands')
  assert.equal(doneStreak(p, { '1': true, '4': true }, '2026-09-20'), 1, 'a missed day 2 ends the run')
  assert.equal(doneStreak(p, {}, '2026-09-20'), 0)
  assert.equal(doneStreak(p, { '1': true, '2': true, '4': true, '5': true }, '2026-09-20'), 4)
}

// The next thing to start: first work block with a link that is not yet marked.
{
  const blocks: HydratedDay['blocks'] = [
    { kind: 'drill', minutes: 25, label: 'a', href: '/mark?a', question: { paperCode: '9709/12', paperSession: 'ON2024', questionNumber: '2' } },
    { kind: 'break', minutes: 5, label: '' },
    { kind: 'drill', minutes: 25, label: 'b', href: '/mark?b' },
  ]
  assert.equal(nextBlock({ blocks }, new Set())?.label, 'a')
  assert.equal(nextBlock({ blocks }, new Set(['q:9709/12|ON2024|2']))?.label, 'b', 'skips the marked one')
  assert.equal(nextBlock({ blocks: [{ kind: 'rest', minutes: 0, label: 'r' }] }, new Set()), null)
}

// Weeks of seven from day 1.
{
  const p = { days: Array.from({ length: 16 }, (_, i) => day(i + 1, `2026-09-${String(16 + i).padStart(2, '0')}`, 'study', 50)) }
  const w = planWeeks(p)
  assert.equal(w.length, 3)
  assert.deepEqual([w[0]!.from, w[0]!.to, w[0]!.days.length], ['2026-09-16', '2026-09-22', 7])
  assert.deepEqual([w[2]!.index, w[2]!.from, w[2]!.days.length], [3, '2026-09-30', 2])
}

// The line never scolds and is specific to where the student is.
assert.match(checkinLine(plan.days[2]!, planProgress(plan, {}, '2026-09-18')), /Rest day/)
assert.match(checkinLine(plan.days[4]!, planProgress(plan, {}, '2026-09-20')), /sleep/i)
assert.match(
  checkinLine(day(9, '2026-09-24', 'study', 50), { scheduled: 8, done: 4, behind: 4, totalWorkDays: 12, totalDone: 4 }),
  /4 days behind.*Don't catch up/
)
assert.match(
  checkinLine(day(9, '2026-09-24', 'study', 50), { scheduled: 8, done: 7, behind: 1, totalWorkDays: 12, totalDone: 7 }),
  /slipped/
)
assert.match(
  checkinLine(day(9, '2026-09-24', 'study', 50), { scheduled: 8, done: 8, behind: 0, totalWorkDays: 12, totalDone: 8 }),
  /8 days done, none missed/
)
assert.ok(checkinLine(day(1, '2026-09-16', 'study', 50, 19), { scheduled: 0, done: 0, behind: 0, totalWorkDays: 12, totalDone: 0 }).length > 10)

assert.equal(formatPlanDate('2026-09-16'), 'Wed 16 Sept')
assert.equal(formatMinutes(45), '45 min')
assert.equal(formatMinutes(60), '1 h')
assert.equal(formatMinutes(90), '1 h 30 min')
assert.equal(workBlocks(plan.days[0]!).length, 2)
assert.equal(workBlocks(plan.days[2]!).length, 0)
assert.equal(isoDate(new Date(Date.UTC(2026, 8, 16, 23, 30))), '2026-09-16')

// Time zones: "today" is the student's, not the server's.
{
  const t = new Date('2026-09-16T20:30:00Z')
  assert.equal(todayInZone('Asia/Karachi', t), '2026-09-17', 'Karachi is already on the 17th')
  assert.equal(todayInZone('Asia/Singapore', t), '2026-09-17')
  assert.equal(todayInZone('Europe/London', t), '2026-09-16')
  assert.equal(todayInZone('America/Los_Angeles', t), '2026-09-16')
  assert.equal(todayInZone('Not/AZone', t), '2026-09-16', 'unknown zone falls back to UTC')
  assert.equal(todayInZone(null, t), '2026-09-16')
  assert.equal(hourInZone('Asia/Karachi', new Date('2026-09-16T02:00:00Z')), 7)
  assert.equal(hourInZone('America/New_York', new Date('2026-09-16T11:30:00Z')), 7, 'EDT')
  assert.equal(hourInZone('UTC', new Date('2026-09-16T00:10:00Z')), 0, 'midnight is 0, never 24')
  assert.equal(hourInZone('Bad/Zone', new Date('2026-09-16T23:10:00Z')), 23)
  assert.ok(isValidTimeZone('Asia/Karachi'))
  assert.ok(!isValidTimeZone('Nope/Zone'))
  assert.ok(!isValidTimeZone(''))
  assert.ok(!isValidTimeZone('x'.repeat(65)))
}

// Evidence: a marked question is recognised by what it is, not by a tick.
{
  const q = { paperCode: '9709/12', paperSession: 'ON2024', questionNumber: '2(b)' }
  const drill: HydratedDay['blocks'][number] = { kind: 'drill', minutes: 25, label: 'x', subjectCode: '9709', topic: { code: '1.6', name: 'Series', source: 'high_yield', weight: 15 }, question: q }
  assert.equal(blockEvidenceKey(drill), 'q:9709/12|ON2024|2(b)')
  const ib: HydratedDay['blocks'][number] = { kind: 'drill', minutes: 25, label: 'x', subjectCode: 'ib-physics-sl', topic: { code: 'A.1', name: 'Kinematics', source: 'syllabus', weight: 0 } }
  assert.equal(blockEvidenceKey(ib), 't:ib-physics-sl|A.1')
  assert.equal(blockEvidenceKey({ kind: 'break', minutes: 5, label: '5 min off' }), null)
  assert.equal(blockEvidenceKey({ kind: 'review', minutes: 25, label: 'r', subjectCode: '9709' }), null)
  const d = { blocks: [drill, { kind: 'break' as const, minutes: 5, label: '' }, ib] }
  assert.deepEqual(markedBlocks(d, new Set(['q:9709/12|ON2024|2(b)'])), { marked: 1, total: 2 })
  assert.deepEqual(markedBlocks(d, new Set()), { marked: 0, total: 2 })
}

// Rebuilding keeps ticks by date, not by day number.
{
  const oldPlan = { days: [day(1, '2026-09-16', 'study', 50), day(2, '2026-09-17', 'study', 50), day(3, '2026-09-18', 'study', 50)] }
  // Rebuilt a day later from the 17th: yesterday's day 1 is gone; the 17th is now day 1.
  const newPlan = { days: [day(1, '2026-09-17', 'study', 50), day(2, '2026-09-18', 'rest', 0), day(3, '2026-09-19', 'study', 50)] }
  assert.deepEqual(carryOverDone(oldPlan, { '1': true, '2': true, '3': true }, newPlan), { '1': true }, 'the 17th keeps its tick; the 18th became a rest day; the 16th is not in the plan')
  assert.deepEqual(carryOverDone(oldPlan, {}, newPlan), {})
}

console.log('plan-view.test.ts: ok')
