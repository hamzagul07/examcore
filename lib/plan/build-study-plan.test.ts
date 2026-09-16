import assert from 'node:assert/strict'
import {
  buildStudyPlan,
  layoutBlocks,
  planLength,
  timedPaperCount,
  topicRotation,
  weekdayIndex,
  FOCUS_BLOCK_MIN,
  LONG_BREAK_MIN,
  MIN_USEFUL_MINUTES,
  SHORT_BREAK_MIN,
  TIMED_PAPER_MIN,
  type PlanSubjectInput,
  type PlanTopic,
  type WeekAvailability,
} from '@/lib/plan/build-study-plan'

const hy = (code: string, name: string, weight: number): PlanTopic => ({
  code,
  name,
  source: 'high_yield',
  weight,
})
const weak = (code: string, name: string, pct: number): PlanTopic => ({
  code,
  name,
  source: 'weak',
  weight: pct,
})

const MATHS: PlanSubjectInput = {
  code: '9709',
  label: 'Mathematics',
  highYield: [hy('1.6', 'Series', 15), hy('1.7', 'Differentiation', 13), hy('1.5', 'Trigonometry', 12), hy('2.1', 'Algebra', 12)],
  weak: [weak('1.5', 'Trigonometry', 38), weak('5.4', 'Probability', 41)],
  hasTimedPaper: true,
}
const PHYSICS: PlanSubjectInput = {
  code: '9702',
  label: 'Physics',
  highYield: [hy('9.1', 'Kinematics', 14), hy('12.2', 'Waves', 11)],
  weak: [],
  hasTimedPaper: true,
}

const EVERY_DAY: WeekAvailability = [90, 90, 90, 90, 90, 90, 90]

// 2026-09-16 is a Wednesday. Exam 19 days later, as the student who asked.
const START = '2026-09-16'
const EXAM_19 = '2026-10-05'

// --- calendar ----------------------------------------------------------------

assert.equal(planLength(START, EXAM_19), 19)
assert.equal(planLength(START, START), 0, 'exam today has no plan days')
assert.equal(planLength(START, '2026-09-10'), 0, 'a past exam never goes negative')
assert.equal(weekdayIndex('2026-09-14'), 0, 'Monday is 0')
assert.equal(weekdayIndex('2026-09-16'), 2, 'Wednesday is 2')
assert.equal(weekdayIndex('2026-09-20'), 6, 'Sunday is 6')

// --- blocks and breaks ---------------------------------------------------------

{
  const b = layoutBlocks(90)
  const kinds = b.map((x) => x.kind).join(',')
  assert.equal(kinds, 'work,break,work,break,work', 'work never ends on a break')
  const total = b.reduce((n, x) => n + x.minutes, 0)
  assert.ok(total <= 90, `never exceeds what the student has: ${total}`)
  assert.equal(b[0]!.minutes, FOCUS_BLOCK_MIN)
  assert.equal(b[1]!.minutes, SHORT_BREAK_MIN)
}
{
  // Four blocks earn a long break before the fifth.
  const b = layoutBlocks(25 * 5 + 5 * 3 + 15)
  const breaks = b.filter((x) => x.kind === 'break').map((x) => x.minutes)
  assert.deepEqual(breaks, [5, 5, 5, LONG_BREAK_MIN], 'long break after the fourth block')
}
assert.deepEqual(layoutBlocks(MIN_USEFUL_MINUTES - 1), [], 'under a block is nothing')
assert.deepEqual(layoutBlocks(MIN_USEFUL_MINUTES), [{ kind: 'work', minutes: 25 }])
{
  // 40 minutes: one block, then not enough left for break + a useful block.
  const b = layoutBlocks(40)
  assert.deepEqual(b, [{ kind: 'work', minutes: 25 }], 'no break when nothing useful follows')
}

// --- topic rotation by preparedness --------------------------------------------

{
  const pass = topicRotation(MATHS, 'pass').map((t) => t.code)
  assert.ok(!pass.includes('5.4'), 'pass: a weak topic that never comes up is skipped')
  assert.equal(pass[0], '1.5', 'pass: a weak topic that IS high-yield goes first')
  assert.deepEqual(pass, ['1.5', '1.6', '1.7', '2.1'], 'pass: then high-yield in frequency order, deduped')
}
{
  const secure = topicRotation(MATHS, 'secure').map((t) => t.code)
  assert.deepEqual(secure.slice(0, 2), ['1.5', '5.4'], 'secure: weak topics first')
  assert.equal(new Set(secure).size, secure.length, 'no duplicates')
}
{
  const stretch = topicRotation(MATHS, 'stretch').map((t) => t.code)
  assert.equal(stretch[0], '1.6', 'stretch: high-yield first')
  assert.ok(stretch.includes('5.4'), 'stretch: weak topics still follow')
}
assert.deepEqual(topicRotation({ ...MATHS, highYield: [], weak: [] }, 'pass'), [])

// --- timed papers ----------------------------------------------------------------

assert.equal(timedPaperCount('pass', 3), 0, 'too short for a timed paper')
assert.equal(timedPaperCount('pass', 14), 2)
assert.equal(timedPaperCount('secure', 14), 4)
assert.equal(timedPaperCount('stretch', 14), 6)
assert.equal(timedPaperCount('pass', 4), 1, 'never zero once there is room')

// --- the 19-day plan -----------------------------------------------------------------

{
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS],
  })
  assert.equal(plan.days.length, 19)
  assert.equal(plan.days[0]!.date, START)
  assert.equal(plan.days[18]!.daysLeft, 1)
  assert.equal(plan.days[0]!.daysLeft, 19)

  // Taper: last two days are review only, no timed papers, nothing new.
  for (const d of plan.days.slice(-2)) {
    assert.equal(d.kind, 'review', `day ${d.day} is review`)
    assert.ok(!d.blocks.some((b) => b.kind === 'timed_paper' || b.kind === 'drill'))
  }
  assert.match(plan.days[18]!.focus, /sleep/i, 'the night before says to stop')

  // A timed paper never lands on day 1.
  assert.ok(!plan.days[0]!.blocks.some((b) => b.kind === 'timed_paper'), 'warm up first')
  const paperDays = plan.days.filter((d) => d.blocks.some((b) => b.kind === 'timed_paper'))
  assert.equal(paperDays.length, timedPaperCount('pass', plan.days.filter((d) => d.kind === 'study').length))
  for (const d of paperDays) {
    const paper = d.blocks.find((b) => b.kind === 'timed_paper')!
    assert.equal(paper.minutes, TIMED_PAPER_MIN)
    assert.match(paper.label, /then mark it/, 'a paper is only useful once marked')
  }

  // One weekly rest day imposed when nothing natural exists (19 days ≥ 10).
  const rests = plan.days.filter((d) => d.kind === 'rest')
  assert.ok(rests.length >= 2, `a rest day per 7-day window: ${rests.length}`)
  assert.ok(rests.every((d) => d.workMinutes === 0))
  assert.notEqual(plan.days[0]!.kind, 'rest', 'day 1 is never an imposed rest day')
  assert.ok(
    rests.every((d) => weekdayIndex(d.date) >= 5),
    `on a flat week the rest day is a weekend day: ${rests.map((d) => d.date).join(',')}`
  )

  // Never over the budget; breaks are real blocks between work.
  for (const d of plan.days) {
    assert.ok(d.workMinutes <= 90, `day ${d.day} within budget`)
    const total = d.blocks.reduce((n, b) => n + b.minutes, 0)
    assert.ok(total <= 90, `day ${d.day} blocks incl. breaks within budget: ${total}`)
    if (d.kind === 'study') {
      assert.ok(d.blocks.some((b) => b.kind === 'break'), `day ${d.day} has a break`)
      assert.notEqual(d.blocks[d.blocks.length - 1]!.kind, 'break', 'no trailing break')
    }
  }

  // Pass mode: every drill is a high-yield topic (or a weak one that is also high-yield).
  const hyCodes = new Set(MATHS.highYield.map((t) => t.code))
  for (const d of plan.days) {
    for (const b of d.blocks) {
      if (b.kind === 'drill' && b.topic) {
        assert.ok(hyCodes.has(b.topic.code), `pass never drills off-yield: ${b.topic.code}`)
      }
    }
  }

  assert.equal(
    plan.totalWorkMinutes,
    plan.days.reduce((n, d) => n + d.workMinutes, 0),
    'total is the sum of the days'
  )
  assert.match(plan.headline, /19 days to go/)
}

// --- commitments are hard ----------------------------------------------------------

{
  // Tuition Tuesday and Thursday (0 min), a short Saturday (45 min).
  const avail: WeekAvailability = [90, 0, 90, 0, 90, 45, 90]
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'secure',
    minutesPerDay: 90,
    availability: avail,
    subjects: [MATHS],
  })
  for (const d of plan.days) {
    const cap = avail[weekdayIndex(d.date)]!
    assert.ok(d.workMinutes <= cap, `${d.date} respects ${cap} min: ${d.workMinutes}`)
    if (cap === 0) {
      assert.equal(d.kind, 'rest', `${d.date} is a rest day because the student said so`)
      assert.match(d.focus, /you told us/i)
    }
  }
  // A 45-minute day gets exactly one focused block — never a timed paper.
  const sat = plan.days.filter((d) => weekdayIndex(d.date) === 5 && d.kind === 'study')
  for (const d of sat) {
    assert.ok(!d.blocks.some((b) => b.kind === 'timed_paper'), 'no 50-min paper in 45 min')
    assert.equal(d.blocks.filter((b) => b.kind === 'drill').length, 1)
  }
  // Two natural rest days a week means no extra one is imposed.
  const imposed = plan.days.filter((d) => d.kind === 'rest' && /holds without it/.test(d.focus))
  assert.equal(imposed.length, 0, 'natural rest days are enough')
}

// --- two subjects share the day fairly -----------------------------------------------

{
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'secure',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS, PHYSICS],
  })
  const counts = new Map<string, number>()
  for (const d of plan.days) for (const b of d.blocks) if (b.subjectCode) counts.set(b.subjectCode, (counts.get(b.subjectCode) ?? 0) + b.minutes)
  const m = counts.get('9709') ?? 0
  const p = counts.get('9702') ?? 0
  assert.ok(Math.abs(m - p) / Math.max(m, p) < 0.35, `subjects share time: maths ${m}, physics ${p}`)
  // A drill day with 3 blocks touches both subjects.
  const drillDay = plan.days.find((d) => d.kind === 'study' && d.blocks.filter((b) => b.kind === 'drill').length >= 3)!
  const subjectsInDay = new Set(drillDay.blocks.filter((b) => b.kind === 'drill').map((b) => b.subjectCode))
  assert.equal(subjectsInDay.size, 2, 'a day alternates subjects')
  // Timed papers alternate subjects too.
  const papers = plan.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'timed_paper')).map((b) => b.subjectCode)
  assert.ok(new Set(papers).size === 2, `papers cover both subjects: ${papers.join(',')}`)
}

// --- edges -------------------------------------------------------------------------------

{
  const one = buildStudyPlan({
    startDate: START,
    examDate: '2026-09-17',
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS],
  })
  assert.equal(one.days.length, 1)
  assert.equal(one.days[0]!.kind, 'review', 'the day before is review, not a fresh drill')
  assert.equal(one.days[0]!.daysLeft, 1)
}
{
  const none = buildStudyPlan({
    startDate: START,
    examDate: START,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS],
  })
  assert.equal(none.days.length, 0)
  assert.match(none.headline, /today or has passed/)
}
{
  const noSubjects = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [],
  })
  assert.equal(noSubjects.days.length, 0)
  assert.match(noSubjects.headline, /at least one subject/)
}
{
  // A subject with no topic data still gets a plan: generic drills, timed papers.
  const bare = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'secure',
    minutesPerDay: 60,
    availability: EVERY_DAY,
    subjects: [{ code: '9701', label: 'Chemistry', highYield: [], weak: [], hasTimedPaper: true }],
  })
  const drills = bare.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'drill'))
  assert.ok(drills.length > 0)
  assert.ok(drills.every((b) => !b.topic && /past-paper Chemistry question/.test(b.label)))
}
{
  // Availability is capped by minutesPerDay: a weekday set higher than the
  // daily budget still respects the budget.
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 50,
    availability: [200, 200, 200, 200, 200, 200, 200],
    subjects: [MATHS],
  })
  assert.ok(plan.days.every((d) => d.workMinutes <= 50))
  assert.deepEqual(plan.availability, [50, 50, 50, 50, 50, 50, 50])
}

console.log('build-study-plan.test.ts: ok')
