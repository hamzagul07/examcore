import assert from 'node:assert/strict'
import {
  checkinLine,
  findPlanDay,
  formatMinutes,
  formatPlanDate,
  isoDate,
  planProgress,
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

console.log('plan-view.test.ts: ok')
