import assert from 'node:assert/strict'
import {
  LEGACY_PLAN_VERSION,
  PLAN_VERSION,
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
  BUFFER_LABEL,
  NOT_STARTED_LESSON_LINE,
  NO_DIAGNOSTIC_QUESTION,
  NO_TOPIC_INDEX_LINE,
  TASK_KIND,
  buildRoadmap,
  loopStepsFor,
  objectiveFor,
  paperMarkingMinutes,
  stepMinutesFor,
  synthesiseSignals,
  timedPaperBudget,
  validateRoadmap,
  type BuildRoadmapInput,
  type RoadmapSubjectInput,
  type StudyPlan,
} from '@/lib/plan/build-study-plan'
import { isCalmCopy } from '@/lib/plan/feasibility'
import { MIN_TASK_MINUTES, STEP_GAP_DAYS } from '@/lib/plan/modes'
import { WORK_KINDS } from '@/lib/plan/plan-view'
import { minuteOfDay } from '@/lib/plan/roadmap-view'
import {
  DEFAULT_AVAILABILITY,
  MIN_BUFFER_MINUTES,
  TASK_CATEGORY,
  UTILISATION_MAX,
  UTILISATION_MIN,
  type RoadmapAvailability,
  type TopicPriority,
  type TopicSignals,
} from '@/lib/plan/roadmap-types'

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
  assert.equal(plan.version, LEGACY_PLAN_VERSION, 'a v2-shaped plan carries the last version that produced that shape, so it is offered the roadmap rebuild')
  assert.ok(plan.version < PLAN_VERSION)
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
  const imposed = plan.days.filter((d) => d.kind === 'rest' && /hold without it/.test(d.focus))
  assert.equal(imposed.length, 0, 'natural rest days are enough')
}

// --- real paper lengths ----------------------------------------------------------------

{
  const withPaper: PlanSubjectInput = { ...MATHS, paperMinutes: 105 }
  const roomy = buildStudyPlan({ startDate: START, examDate: EXAM_19, preparedness: 'stretch', minutesPerDay: 120, availability: [120, 120, 120, 120, 120, 120, 120], subjects: [withPaper] })
  const full = roomy.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'timed_paper'))
  assert.ok(full.length > 0)
  assert.ok(full.every((b) => b.minutes === 105), 'a 120-minute day sits the whole 105-minute paper')
  assert.match(full[0]!.label, /105 min, no notes/)
  const tight = buildStudyPlan({ startDate: START, examDate: EXAM_19, preparedness: 'stretch', minutesPerDay: 90, availability: EVERY_DAY, subjects: [withPaper] })
  const part = tight.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'timed_paper'))
  assert.ok(part.every((b) => b.minutes === 90), 'a 90-minute day sits what fits')
  assert.match(part[0]!.label, /first 90 min of a 105-min paper/)
  assert.ok(tight.days.every((d) => d.workMinutes <= 90))
}

// --- specific dates the student is away ----------------------------------------------

{
  // Away Sat 19 – Sun 20 Sep (a trip) and Fri 25 (a wedding).
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'secure',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS],
    blockedDates: ['2026-09-19', '2026-09-20', '2026-09-25', 'not-a-date', '2026-12-25'],
    timeZone: 'Asia/Karachi',
  })
  assert.deepEqual(plan.blockedDates, ['2026-09-19', '2026-09-20', '2026-09-25', '2026-12-25'], 'kept, sorted, junk dropped')
  assert.equal(plan.timeZone, 'Asia/Karachi')
  for (const date of ['2026-09-19', '2026-09-20', '2026-09-25']) {
    const d = plan.days.find((x) => x.date === date)!
    assert.equal(d.kind, 'rest', `${date} is a rest day`)
    assert.match(d.focus, /away/, `${date} says why`)
  }
  // Those trips are natural rest days, so no extra one is imposed in those windows.
  const imposed = plan.days.filter((d) => d.kind === 'rest' && /hold without it/.test(d.focus))
  assert.equal(imposed.length, 0, `no imposed rest on top of trips: ${imposed.map((d) => d.date).join(',')}`)
  // A timed paper never lands on a blocked date.
  assert.ok(!plan.days.some((d) => plan.blockedDates.includes(d.date) && d.blocks.some((b) => b.kind === 'timed_paper')))
}
{
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS],
  })
  assert.deepEqual(plan.blockedDates, [])
  assert.equal(plan.timeZone, 'UTC', 'defaults to UTC when the client sends nothing')
}

// --- IB: no frequency data, so the syllabus is the rotation -----------------------------

{
  const syl = (code: string, name: string): PlanTopic => ({ code, name, source: 'syllabus', weight: 0 })
  const IB_PHYSICS: PlanSubjectInput = {
    code: 'ib-physics-sl',
    label: 'Physics SL',
    highYield: [],
    weak: [weak('B.2', 'Greenhouse effect', 30)],
    syllabus: [syl('A.1', 'Kinematics'), syl('A.2', 'Forces and momentum'), syl('B.1', 'Thermal energy transfers'), syl('B.2', 'Greenhouse effect')],
    hasTimedPaper: true,
  }
  assert.deepEqual(
    topicRotation(IB_PHYSICS, 'pass').map((t) => t.code),
    ['B.2', 'A.1', 'A.2', 'B.1'],
    'pass with no frequency data: a weak topic on the syllabus first, then the syllabus in order'
  )
  assert.deepEqual(topicRotation(IB_PHYSICS, 'secure').map((t) => t.code), ['B.2', 'A.1', 'A.2', 'B.1'])
  assert.deepEqual(topicRotation(IB_PHYSICS, 'stretch').map((t) => t.code), ['A.1', 'A.2', 'B.1', 'B.2'])

  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 60,
    availability: EVERY_DAY,
    subjects: [IB_PHYSICS],
  })
  const drills = plan.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'drill'))
  assert.ok(drills.length > 0)
  assert.ok(drills.every((b) => b.topic), 'every IB drill names a syllabus topic')
  assert.ok(drills.some((b) => b.label === 'Kinematics — one question, then mark it'), 'syllabus label carries no paper count')
  // High-yield still wins when it exists.
  assert.equal(topicRotation({ ...IB_PHYSICS, highYield: [hy('A.2', 'Forces and momentum', 9)] }, 'stretch')[0]!.code, 'A.2')
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

// --- each subject sits its own paper ---------------------------------------------------

{
  // Maths on 25 Sep (inside the plan), Physics on 5 Oct (the last exam).
  const MATHS_EARLY: PlanSubjectInput = { ...MATHS, examDate: '2026-09-25' }
  const plan = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'secure',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS_EARLY, PHYSICS],
  })
  assert.equal(plan.examDate, EXAM_19, 'the plan runs to the last exam')
  assert.equal(plan.days.length, 19)
  assert.deepEqual(
    plan.subjects.map((s) => [s.code, s.examDate]),
    [['9709', '2026-09-25'], ['9702', EXAM_19]]
  )

  const examDay = plan.days.find((d) => d.date === '2026-09-25')!
  assert.equal(examDay.kind, 'exam')
  assert.match(examDay.focus, /Mathematics exam today/)
  assert.equal(examDay.workMinutes, 0)

  // After its paper, no more Maths.
  for (const d of plan.days.filter((d) => d.date > '2026-09-25')) {
    assert.ok(!d.blocks.some((b) => b.subjectCode === '9709'), `${d.date} has no Maths`)
  }

  // The two days before: Maths reviews while Physics still drills — a study
  // day, not the plan's taper.
  const before = ['2026-09-23', '2026-09-24'].map((date) => plan.days.find((x) => x.date === date)!)
  for (const d of before) {
    assert.equal(d.kind, 'study', `${d.date} is mixed, not a full taper`)
    const maths = d.blocks.filter((b) => b.subjectCode === '9709')
    assert.ok(maths.every((b) => b.kind === 'review'), `${d.date}: any Maths block is review`)
    assert.ok(!d.blocks.some((b) => b.kind === 'timed_paper' && b.subjectCode === '9709'), `${d.date}: no Maths paper in its taper`)
  }
  assert.ok(
    before.some((d) => d.blocks.some((b) => b.subjectCode === '9709' && b.kind === 'review')),
    'Maths gets at least one review block in its taper'
  )
  assert.ok(before.some((d) => /Mathematics review only/.test(d.focus)), 'the day says which subject is reviewing')

  // Physics' own taper is the plan's last two days.
  for (const d of plan.days.slice(-2)) assert.equal(d.kind, 'review')

  // Timed papers: both subjects get one, one per day, never in a subject's taper or after.
  const papers = plan.days.flatMap((d) =>
    d.blocks.filter((b) => b.kind === 'timed_paper').map((b) => ({ date: d.date, code: b.subjectCode }))
  )
  assert.ok(papers.some((p) => p.code === '9709') && papers.some((p) => p.code === '9702'), `papers: ${JSON.stringify(papers)}`)
  assert.ok(papers.filter((p) => p.code === '9709').every((p) => p.date < '2026-09-23'))
  assert.equal(new Set(papers.map((p) => p.date)).size, papers.length, 'one paper per day')

  // The exam day is already quiet, so no rest day is imposed on it or doubled next to it.
  assert.ok(!/hold without it/.test(examDay.focus))
  assert.ok(plan.days.every((d) => d.workMinutes <= 90))
}
{
  // A subject whose exam has passed is not planned; one dated later than the plan's date extends it.
  const gone = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [{ ...MATHS, examDate: '2026-09-10' }, PHYSICS],
  })
  assert.deepEqual(gone.subjects.map((s) => s.code), ['9702'])
  assert.ok(!gone.days.some((d) => d.blocks.some((b) => b.subjectCode === '9709')))

  const later = buildStudyPlan({
    startDate: START,
    examDate: EXAM_19,
    preparedness: 'pass',
    minutesPerDay: 90,
    availability: EVERY_DAY,
    subjects: [MATHS, { ...PHYSICS, examDate: '2026-10-12' }],
  })
  assert.equal(later.examDate, '2026-10-12', 'the latest subject date wins')
  assert.equal(later.days.length, 26)
  assert.equal(later.days.find((d) => d.date === EXAM_19)!.kind, 'exam', "Maths' exam day is inside the plan")
  assert.ok(later.days.slice(-2).every((d) => d.kind === 'review'))
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

// --- v3: the roadmap -------------------------------------------------------------------

const BANNED = ['behind', 'missed', 'streak', 'catch up', 'failed', 'everyone else', 'verified']
const calm = (text: string) => isCalmCopy(text) && !text.toLowerCase().includes('verified')

const sig = (code: string, name: string, order: number, extra: Partial<TopicSignals> = {}): TopicSignals => ({ code, name, order, coreWeight: 1, ...extra })
const codesOf = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}.${i + 1}`)
const everywhere = (list: string[]) => ({ lesson: list, shortQuestion: list, question: list })

const R_MATHS: RoadmapSubjectInput = {
  code: '9709',
  label: 'Mathematics',
  highYield: [],
  weak: [],
  hasTimedPaper: true,
  paperMinutes: 105,
  signals: codesOf(8, '1').map((c, i) => sig(c, `Maths ${c}`, i, i < 2 ? { mastery: { percentage: 40, attempts: 4 } } : {})),
  destinations: everywhere(codesOf(8, '1')),
  selfRating: 'rusty',
}
const R_PHYSICS: RoadmapSubjectInput = {
  code: '9702',
  label: 'Physics',
  highYield: [],
  weak: [],
  hasTimedPaper: true,
  paperMinutes: 75,
  signals: codesOf(6, '9').map((c, i) => sig(c, `Physics ${c}`, i)),
  destinations: { lesson: codesOf(6, '9'), shortQuestion: [], question: codesOf(6, '9') },
  selfRating: 'confident',
}
// Weekends as light as weekdays, so the weekly rest day lands on a weekend and every Tuesday carries tasks.
const AVAIL: RoadmapAvailability = {
  ...DEFAULT_AVAILABILITY,
  weekendMinutes: 90,
  commitments: [{ id: 'c1', label: 'Tuition', kind: 'tuition', days: [1], start: '17:00', end: '19:00' }],
}
const roadmap = (over: Partial<BuildRoadmapInput> = {}) =>
  buildRoadmap({ startDate: START, examDate: EXAM_19, mode: 'balanced', availabilityDetail: AVAIL, subjects: [R_MATHS, R_PHYSICS], ...over }, { strict: true })

type Dated = _Block & { date: string }
type _Block = StudyPlan['days'][number]['blocks'][number]
const tasksOf = (plan: StudyPlan): Dated[] => plan.days.flatMap((d) => d.blocks.map((b) => ({ ...b, date: d.date })))
const workOf = (plan: StudyPlan): Dated[] => tasksOf(plan).filter((b) => WORK_KINDS.has(b.kind))
const byTopic = (plan: StudyPlan, subject: string) => {
  const map = new Map<string, Dated[]>()
  for (const t of workOf(plan)) {
    if (t.subjectCode !== subject || !t.topic) continue
    map.set(t.topic.code, [...(map.get(t.topic.code) ?? []), t])
  }
  return map
}

// --- the 19-day two-subject roadmap around Tuesday tuition ---------------------------------

{
  const { plan, pools } = roadmap()
  assert.deepEqual(validateRoadmap(plan), [])
  assert.equal(plan.days.length, 19)
  assert.deepEqual([plan.version, plan.algorithmVersion, plan.revision, plan.mode, plan.preparedness], [3, 3, 1, 'balanced', 'secure'])
  assert.deepEqual(plan.availability, [90, 90, 90, 90, 90, 90, 90], 'the 7-array is derived from the detail')
  assert.equal(plan.minutesPerDay, 90)
  assert.deepEqual(plan.exams!.map((e) => [e.subjectCode, e.examDate, e.paperMinutes]), [['9709', EXAM_19, 105], ['9702', EXAM_19, 75]])
  assert.ok(plan.feasibility && ['on_track', 'focused', 'tight'].includes(plan.feasibility.state))
  assert.ok(plan.feasibility!.supplyMinutes > 0 && plan.feasibility!.plannedMinutes > 0)
  assert.equal(plan.feasibility!.plannedMinutes, plan.totalWorkMinutes)
  assert.ok(plan.feasibility!.utilisation > 0.5 && plan.feasibility!.utilisation <= 1)
  assert.match(plan.headline, /19 days to go/)
  assert.deepEqual(Object.keys(pools).sort(), ['9702', '9709'])
  assert.ok(pools['9709']!.every((t) => ['must', 'should', 'could'].includes(t.band)))

  // Tuesdays: tuition is a commitment on the day, and nothing sits inside it.
  const tuesdays = plan.days.filter((d) => weekdayIndex(d.date) === 1)
  assert.ok(tuesdays.some((d) => d.workMinutes > 0), 'a Tuesday carries tasks')
  for (const d of tuesdays) {
    assert.ok(d.commitments!.some((c) => c.kind === 'tuition' && c.start === '17:00'), `${d.date} lists the tuition`)
    for (const b of d.blocks) {
      if (!b.startsAt) continue
      const s = minuteOfDay(b.startsAt)
      const e = minuteOfDay(b.endsAt)
      assert.ok(e <= 17 * 60 || s >= 19 * 60, `${d.date} ${b.id} sits outside 17:00–19:00 (${b.startsAt}–${b.endsAt})`)
    }
  }

  // Days: windows, capacity, time in hand, work by membership.
  const ids = new Set<string>()
  for (const d of plan.days) {
    const work = d.blocks.filter((b) => WORK_KINDS.has(b.kind)).reduce((n, b) => n + b.minutes, 0)
    assert.equal(d.workMinutes, work, `${d.date} work is the WORK_KINDS sum`)
    const buffers = d.blocks.filter((b) => b.kind === 'buffer')
    assert.ok(buffers.length <= 1)
    if (d.bufferMinutes! < MIN_BUFFER_MINUTES) assert.equal(buffers.length, 0, `${d.date}: no buffer block under ${MIN_BUFFER_MINUTES} min`)
    for (const b of buffers) assert.equal(b.label, BUFFER_LABEL)
    if (d.workMinutes > 0) {
      assert.ok(d.windows!.length > 0, `${d.date} has windows`)
      assert.ok(d.capacityMinutes! >= d.workMinutes)
      assert.ok(d.capacityMinutes! <= 90, `${d.date} capacity is capped by the stated minutes`)
    } else {
      assert.equal(d.capacityMinutes, 0)
    }
    for (const b of d.blocks) {
      assert.ok(b.id && b.taskType && b.category && b.objective !== undefined && Array.isArray(b.why) && typeof b.priority === 'number', `${d.date} block carries the task fields`)
      assert.match(b.id!, new RegExp(`^${d.date}-(9709|9702|x)-[^-]+-\\d+$`), `tuple-shaped id: ${b.id}`)
      assert.ok(!ids.has(b.id!), `unique id: ${b.id}`)
      ids.add(b.id!)
      assert.equal(b.category, TASK_CATEGORY[b.taskType!])
      assert.equal(b.kind, TASK_KIND[b.taskType!])
      assert.equal(b.label, b.objective, 'v2 readers show the objective as the label')
      if (b.startsAt) assert.equal(minuteOfDay(b.endsAt) - minuteOfDay(b.startsAt), b.minutes, `${b.id} clock matches its minutes`)
      if (WORK_KINDS.has(b.kind)) {
        assert.ok(b.minutes >= MIN_TASK_MINUTES[b.taskType!], `${b.id} is not under its floor`)
        assert.ok(b.subjectCode && b.subjectLabel, `${b.id} names its subject`)
        assert.ok(calm(b.objective!), `calm objective: ${b.objective}`)
        for (const w of b.why!) assert.ok(calm(w.explanation) && w.explanation.length <= 160, w.explanation)
      }
    }
    assert.ok(calm(d.focus), d.focus)
  }
  for (const line of [plan.headline, ...plan.feasibility!.tradeoffs, plan.feasibility!.headline]) assert.ok(calm(line), line)
  for (const banned of BANNED) assert.ok(!JSON.stringify(plan).toLowerCase().includes(banned), `no "${banned}" anywhere in the plan`)

  // Every topic starts with a diagnostic; a confident subject with no marks has provisional steps after it.
  for (const [code, list] of byTopic(plan, '9702')) {
    assert.deepEqual([list[0]!.taskType, list[0]!.loopStep], ['diagnostic', 'diagnose'], `Physics ${code} starts with a diagnostic`)
    assert.ok(!list[0]!.provisional, 'the diagnostic itself is not provisional')
    // The loop's own steps wait on the diagnostic; a taper-day retrieval review is not a loop step.
    for (const t of list.slice(1)) if (t.loopStep !== 'review') assert.equal(t.provisional, true, `${t.id} is provisional until the diagnostic is marked`)
  }
  for (const [code, list] of byTopic(plan, '9709')) {
    if (code === '1.1' || code === '1.2') {
      // Four marked answers at 40%: the marks set where it starts, so the loop opens on the repair, not a check.
      assert.equal(list[0]!.loopStep, 'repair', `Maths ${code} starts with its repair`)
      for (const t of list) assert.ok(!t.provisional, `${code} has four marked answers, so its steps are settled`)
    } else assert.equal(list[0]!.loopStep, 'diagnose', `Maths ${code} starts with a diagnostic`)
  }
  assert.ok(workOf(plan).some((t) => t.provisional), 'provisional steps exist')

  // Every live subject is touched at least every 3 study days.
  const studyDays = plan.days.filter((d) => d.workMinutes > 0)
  for (const s of plan.subjects) {
    let last = -1
    studyDays.forEach((d, k) => {
      if (d.date >= s.examDate) return
      if (d.blocks.some((b) => b.subjectCode === s.code && WORK_KINDS.has(b.kind))) {
        assert.ok(last < 0 || k - last <= 3, `${s.label} untouched from study day ${last} to ${k}`)
        last = k
      }
    })
  }

  // Timed papers: never day 1, never in a taper, one per day, only where a real sitting fits.
  const papers = tasksOf(plan).filter((t) => t.kind === 'timed_paper')
  assert.ok(papers.length >= 2, `both subjects get a paper: ${papers.length}`)
  assert.ok(!plan.days[0]!.blocks.some((b) => b.kind === 'timed_paper'))
  assert.equal(new Set(papers.map((p) => p.date)).size, papers.length, 'one paper per day')
  for (const p of papers) assert.ok(p.minutes >= 40 && p.minutes <= 105, `a real sitting: ${p.minutes}`)
  for (const d of plan.days.slice(-2)) assert.ok(!d.blocks.some((b) => b.kind !== 'review' && b.kind !== 'break' && b.kind !== 'buffer'), `${d.date} is review only`)

  // Loop steps are spaced: repair → recall never on the same day.
  for (const [, list] of byTopic(plan, '9709')) {
    const repair = list.find((t) => t.loopStep === 'repair')
    const recall = list.find((t) => t.loopStep === 'recall')
    if (repair && recall) assert.ok(recall.date > repair.date, 'recall waits for the next study day')
  }
  // Weekly rest: at least one imposed rest day, never day 1.
  assert.ok(plan.days.some((d) => /hold without it/.test(d.focus)))
  assert.notEqual(plan.days[0]!.kind, 'rest')
}

// --- utilisation and the marks a timed paper needs ---------------------------------------------------

{
  // Over the fixture grid, work plus breaks stays near the 80% target: never past UTILISATION_MAX on a study day
  // (a paper day keeps its marking allowance in hand), and the whole plan sits inside the 75–85% band.
  for (const mode of ['foundation', 'balanced', 'polish'] as const) {
    for (const sessionLength of [20, 40, 60] as const) {
      const { plan } = roadmap({ mode, availabilityDetail: { ...AVAIL, sessionLength } })
      for (const d of plan.days) {
        if (d.workMinutes === 0) continue
        const laid = d.blocks.reduce((n, b) => n + (WORK_KINDS.has(b.kind) || b.kind === 'break' ? b.minutes : 0), 0)
        const paper = d.blocks.find((b) => b.kind === 'timed_paper')
        if (paper) assert.ok(d.bufferMinutes! >= paperMarkingMinutes(paper.minutes), `${d.date}: marking time is kept in hand after the paper`)
        else assert.ok(laid <= Math.floor(d.capacityMinutes! * UTILISATION_MAX) + 1, `${mode}/${sessionLength} ${d.date}: ${laid} of ${d.capacityMinutes} laid`)
      }
      const u = plan.feasibility!.utilisation
      assert.ok(u >= 0.6 && u <= UTILISATION_MAX + 0.01, `${mode}/${sessionLength}: utilisation ${u.toFixed(3)}`)
    }
  }
  const { plan } = roadmap()
  assert.ok(plan.feasibility!.utilisation >= UTILISATION_MIN, `balanced/40 sits inside the band: ${plan.feasibility!.utilisation.toFixed(3)}`)
  assert.deepEqual([plan.feasibility!.capacityMinutes! > 0, plan.feasibility!.laidMinutes! > 0, plan.feasibility!.studyDays! > 0], [true, true, true])
  // Every timed paper and mixed set says why it is there; nothing on the plan has an empty why.
  for (const t of workOf(plan)) assert.ok(t.why!.length > 0, `${t.id} has a reason`)
  const paper = tasksOf(plan).find((t) => t.kind === 'timed_paper')!
  assert.equal(paper.why![0]!.type, 'mode')
  assert.match(paper.why![0]!.explanation, /under time; this is one of \d+ timed sittings? for/)
  assert.match(paper.objective!, /mark it in the \d+ min kept in hand after/)
  // A mostly-rusty subject sits no paper in the first third of its study days; a confident one may.
  const mathsPapers = tasksOf(plan).filter((t) => t.kind === 'timed_paper' && t.subjectCode === '9709').map((t) => t.date).sort()
  const studyDates = plan.days.filter((d) => d.workMinutes > 0 && d.date < EXAM_19).map((d) => d.date)
  assert.ok(mathsPapers.length > 0 && studyDates.indexOf(mathsPapers[0]!) >= Math.floor(studyDates.length / 3), `the rusty subject's first paper waits: ${mathsPapers[0]}`)
  assert.match(plan.headline, /focused hours across \d+ days/)
}

// --- four subjects on short days: every live subject is touched every three study days ---------------------

{
  const four: RoadmapSubjectInput[] = ['A', 'B', 'C', 'D'].map((k, i) => ({
    code: `9${i}00`,
    label: `Subject ${k}`,
    highYield: [],
    weak: [],
    hasTimedPaper: false,
    signals: codesOf(10, `${i}`).map((c, j) => sig(c, `${k} ${c}`, j)),
    destinations: everywhere(codesOf(10, `${i}`)),
    selfRating: 'rusty',
  }))
  const { plan } = buildRoadmap(
    { startDate: START, examDate: '2026-10-16', mode: 'balanced', availabilityDetail: { ...AVAIL, weekdayMinutes: 60, weekendMinutes: 60 }, subjects: four },
    { strict: true }
  )
  const studyDays = plan.days.filter((d) => d.workMinutes > 0)
  for (const s of plan.subjects) {
    let last = -1
    let touched = 0
    studyDays.forEach((d, k) => {
      if (d.date >= s.examDate) return
      if (d.blocks.some((b) => b.subjectCode === s.code && WORK_KINDS.has(b.kind))) {
        assert.ok(last < 0 ? k <= 3 : k - last <= 3, `${s.label} untouched from study day ${last} to ${k}`)
        last = k
        touched += 1
      }
    })
    assert.ok(touched >= 4, `${s.label} was touched ${touched} times`)
  }
}

// --- a subject with no topic index still fills its days, honestly -------------------------------------------

{
  const bare: RoadmapSubjectInput = { code: '4024', label: 'Mathematics D', highYield: [], weak: [], hasTimedPaper: false, signals: [] }
  const { plan, pools } = roadmap({ subjects: [bare] })
  assert.deepEqual(validateRoadmap(plan), [])
  assert.deepEqual(pools['4024'], [], 'nothing to rank')
  const tasks = workOf(plan).filter((t) => t.date < '2026-10-03')
  assert.ok(tasks.length > 0)
  assert.ok(tasks.every((t) => t.taskType === 'mixed'), 'general practice, since there is no topic index')
  for (const t of tasks) {
    assert.ok(t.why!.some((w) => w.type === 'mode' && w.explanation === NO_TOPIC_INDEX_LINE), 'and it says so')
    assert.ok(!t.why!.some((w) => w.type === 'on_syllabus'), 'without claiming a syllabus position')
  }
  assert.ok(plan.feasibility!.utilisation >= 0.6, `the days are filled: ${plan.feasibility!.utilisation.toFixed(3)}`)
  // v2 lists still feed the engine when the signal list is empty rather than absent.
  const withLists = roadmap({ subjects: [{ ...MATHS, signals: [] }] })
  assert.ok(workOf(withLists.plan).some((t) => t.topic), 'the v2 lists stand in for an empty signal list')
}

// --- 20-minute sessions: no timed paper, nothing longer than the session ----------------------

{
  const { plan } = roadmap({ availabilityDetail: { ...AVAIL, sessionLength: 20 } })
  assert.deepEqual(validateRoadmap(plan), [])
  assert.ok(!tasksOf(plan).some((t) => t.kind === 'timed_paper'), '20-minute sessions cannot hold a paper')
  assert.ok(!tasksOf(plan).some((t) => t.taskType === 'timed_set'), 'a 30-minute timed set does not fit a 20-minute slot')
  for (const t of workOf(plan)) assert.ok(t.minutes <= 20, `${t.id} fits the session`)
  assert.ok(plan.feasibility!.tradeoffs.some((l) => /20-minute sessions/.test(l) && /questions one at a time/.test(l)))
  // The confident subject still proves: every opened Physics loop reaches a marked question, or the topic is listed as started.
  const physics = plan.feasibility!.subjects.find((s) => s.code === '9702')!
  assert.ok(physics.plannedTopics >= 3, `Physics reaches its marked questions on 20-minute sessions: ${physics.plannedTopics}`)
  for (const [code, list] of byTopic(plan, '9702')) {
    const proved = list.some((t) => t.loopStep === 'prove')
    assert.ok(proved || physics.started!.includes(`Physics ${code}`), `Physics ${code}: proved or listed as started`)
  }
}

// --- a subject whose paper is in two days gets review only ----------------------------------------

{
  const { plan } = roadmap({ subjects: [{ ...R_MATHS, examDate: '2026-09-18' }, R_PHYSICS] })
  assert.deepEqual(validateRoadmap(plan), [])
  const maths = workOf(plan).filter((t) => t.subjectCode === '9709')
  assert.ok(maths.length > 0, 'Maths still gets something')
  assert.ok(maths.every((t) => t.taskType === 'review' && t.kind === 'review'), 'review only in the taper')
  assert.ok(maths.every((t) => t.date < '2026-09-18'))
  for (const d of plan.days) {
    const m = d.blocks.filter((b) => b.subjectCode === '9709').reduce((n, b) => n + b.minutes, 0)
    assert.ok(m <= 2 * AVAIL.sessionLength, `${d.date}: taper review is capped at two sessions`)
  }
  // Retrieval first — and honest about what there is to compare with: a topic with marked answers compares with them,
  // one never worked checks against the mark scheme and claims nothing beyond the syllabus.
  for (const t of maths) {
    const worked = t.topic?.code === '1.1' || t.topic?.code === '1.2'
    if (worked) assert.match(t.objective!, /then compare with your marked answer/, t.objective)
    else {
      assert.match(t.objective!, /then check it against the mark scheme/, t.objective)
      assert.ok(t.why!.every((w) => w.type === 'on_syllabus'), `${t.id} claims only the syllabus`)
    }
  }
  assert.ok(maths.some((t) => t.topic?.code === '1.1' || t.topic?.code === '1.2'), 'the topics the student has marked come back first')
  assert.ok(workOf(plan).some((t) => t.subjectCode === '9702' && t.kind !== 'review'), 'Physics carries on')
}

// --- an exam is a commitment: another subject reviews after the paper ----------------------------

{
  const { plan } = roadmap({
    subjects: [
      { ...R_MATHS, examDate: '2026-09-25', examTime: '15:00', paperMinutes: 90 },
      { ...R_PHYSICS, examDate: '2026-09-26' },
    ],
  })
  assert.deepEqual(validateRoadmap(plan), [])
  const day = plan.days.find((d) => d.date === '2026-09-25')!
  assert.equal(day.kind, 'exam')
  assert.match(day.focus, /Mathematics exam today/)
  assert.ok(day.commitments!.some((c) => c.kind === 'exam' && c.start === '00:00' && c.end === '17:30'), JSON.stringify(day.commitments))
  const physics = day.blocks.filter((b) => b.subjectCode === '9702' && WORK_KINDS.has(b.kind))
  assert.ok(physics.length >= 1, 'Physics reviews after the paper')
  assert.ok(physics.every((b) => b.kind === 'review'))
  assert.equal(physics.length, 1, 'the evening of a paper holds one short review, not a study session')
  assert.match(day.focus, /only if you feel like it/)
  assert.equal(day.blocks.filter((b) => b.subjectCode === '9709').length, 0, 'no Maths on its exam day')
  for (const b of day.blocks) if (b.startsAt) assert.ok(minuteOfDay(b.startsAt) >= 17 * 60 + 30, `${b.id} starts after the cut`)
  assert.ok(!tasksOf(plan).some((t) => t.subjectCode === '9709' && t.date >= '2026-09-25'))
  assert.ok(!tasksOf(plan).some((t) => t.subjectCode === '9702' && t.date >= '2026-09-26'))
}

// --- a legacy body still builds the v2 shape, stamped as v2 ----------------------------------------

{
  const legacy = buildStudyPlan({ startDate: START, examDate: EXAM_19, preparedness: 'pass', minutesPerDay: 90, availability: EVERY_DAY, subjects: [MATHS] })
  assert.equal(legacy.version, 2, 'planOutdated() must keep offering these plans the roadmap')
  assert.equal(legacy.mode, undefined)
  assert.ok(legacy.days.every((d) => d.blocks.every((b) => b.id === undefined && b.startsAt === undefined)), 'v2 blocks carry no task fields')
  // The same v2 inputs run through the v3 engine.
  const { plan } = roadmap({ subjects: [MATHS, PHYSICS] })
  assert.deepEqual(validateRoadmap(plan), [])
  assert.ok(workOf(plan).some((t) => t.subjectCode === '9709' && t.topic))
  const synth = synthesiseSignals(MATHS)
  assert.deepEqual(synth.map((s) => s.code), ['1.6', '1.7', '1.5', '2.1', '5.4'], 'order from the lists, deduplicated')
  assert.deepEqual(synth.find((s) => s.code === '1.5')!.mastery, { percentage: 38, attempts: 3 }, 'weak weights become mastery')
  assert.equal(synth.find((s) => s.code === '1.6')!.frequency, undefined, 'no frequency claim from a v2 list')
}

// --- destinations decide the steps ------------------------------------------------------------------

{
  const entry = (over: Partial<TopicPriority>): TopicPriority => ({ code: '1.1', name: 'T', score: 1, why: [{ type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'On the syllabus' }], band: 'must', mastery: 0.3, uncertainty: 0, loop: 'weak', ...over })
  const all = everywhere(['1.1'])
  const weak = loopStepsFor(entry({}), all)!
  assert.deepEqual(weak.steps.map((s) => [s.step, s.taskType, s.provisional]), [['repair', 'concept', false], ['recall', 'recall', false], ['prove', 'question', false]], 'a known-weak topic skips the check the marks already made')
  assert.deepEqual([weak.spaced.step, weak.spaced.taskType], ['review', 'review'])
  const unsureWeak = loopStepsFor(entry({ uncertainty: 0.34 }), all)!
  assert.equal(unsureWeak.steps[0]!.step, 'diagnose', 'two marked answers are not enough to skip the check')
  // A 20-minute session cannot hold a timed set: the strong loop proves with one question.
  const short = loopStepsFor(entry({ mastery: 0.8, loop: 'strong' }), all, { sessionLength: 20 })!
  assert.deepEqual(short.steps.map((s) => [s.step, s.taskType]), [['prove', 'question'], ['review', 'error_review']])
  const strong = loopStepsFor(entry({ mastery: 0.8, loop: 'strong' }), all)!
  assert.deepEqual(strong.steps.map((s) => [s.step, s.taskType]), [['prove', 'timed_set'], ['review', 'error_review']])
  assert.deepEqual([strong.spaced.step, strong.spaced.taskType], ['recall', 'recall'], "the strong loop's spaced step is its recall")
  const unsure = loopStepsFor(entry({ mastery: 0.8, loop: 'strong', uncertainty: 1 }), all)!
  assert.equal(unsure.steps[0]!.step, 'diagnose')
  assert.ok(unsure.steps.slice(1).every((s) => s.provisional) && unsure.spaced.provisional)
  // No lesson and no short question: the diagnostic is dropped and the plan says so.
  const questionOnly = loopStepsFor(entry({ uncertainty: 1 }), { lesson: [], shortQuestion: [], question: ['1.1'] })!
  assert.deepEqual(questionOnly.steps.map((s) => s.taskType), ['question'])
  assert.ok(questionOnly.why.some((w) => w.type === 'mode' && w.source === 'plan' && w.confidence === 'low' && w.explanation === NO_DIAGNOSTIC_QUESTION))
  assert.equal(loopStepsFor(entry({}), { lesson: [], shortQuestion: [], question: [] }), null, 'nowhere to go: dropped')
  // Absent destinations: every topic has a question, none a lesson.
  const ib = loopStepsFor(entry({ uncertainty: 1 }), null)!
  assert.ok(!ib.steps.some((s) => s.taskType === 'diagnostic' || s.taskType === 'concept' || s.taskType === 'recall'))
  const { plan } = roadmap({ subjects: [{ ...R_PHYSICS, destinations: undefined }] })
  assert.deepEqual(validateRoadmap(plan), [])
  assert.ok(!workOf(plan).some((t) => t.taskType === 'diagnostic' || t.kind === 'learn'), 'no lessons without a lesson destination')
  assert.ok(workOf(plan).some((t) => t.taskType === 'question' || t.taskType === 'timed_set'))
}

// --- sizing ------------------------------------------------------------------------------------------

{
  assert.equal(stepMinutesFor('concept', { concept: 1.5 }), 30)
  assert.equal(stepMinutesFor('review', undefined), 10)
  assert.equal(stepMinutesFor('diagnostic', { diagnostic: 0.5 }), 10, 'never under the floor')
  assert.equal(stepMinutesFor('question', { question: 1.25 }), 25, 'rounded to five')
  const { plan } = roadmap({ durationScale: { concept: 1.5 } })
  assert.deepEqual(validateRoadmap(plan), [])
  const concepts = workOf(plan).filter((t) => t.taskType === 'concept')
  assert.ok(concepts.length > 0)
  assert.equal(Math.max(...concepts.map((t) => t.minutes)), 30, 'a scaled concept is 30 minutes when the slot allows')
  assert.ok(concepts.every((t) => t.minutes <= 30 && t.minutes >= MIN_TASK_MINUTES.concept))
  assert.deepEqual(plan.durationScale, { concept: 1.5 })

  assert.equal(timedPaperBudget('balanced', 3), 0)
  assert.equal(timedPaperBudget('balanced', 14), 3)
  assert.equal(timedPaperBudget('foundation', 14), 1)
  assert.equal(timedPaperBudget('polish', 14), 6)
  assert.equal(objectiveFor('timed_set', { topic: 'Series', subject: 'Mathematics', minutes: 30 }), 'Two or three Series questions in 30 minutes, then mark them.')
  assert.equal(objectiveFor('mixed', { subject: 'Mathematics', minutes: 25 }), 'Mixed Mathematics questions across recent topics, 25 minutes, then mark.')
  assert.equal(objectiveFor('break', { subject: '', minutes: 5 }), '5 min off')
}

// --- modes, priority subject, blocked dates ----------------------------------------------------------

{
  for (const mode of ['foundation', 'balanced', 'polish'] as const) {
    const { plan } = roadmap({ mode, prioritySubject: '9702', blockedDates: ['2026-09-19', '2026-09-20'] })
    assert.deepEqual(validateRoadmap(plan), [], mode)
    assert.equal(plan.mode, mode)
    for (const date of ['2026-09-19', '2026-09-20']) assert.equal(plan.days.find((d) => d.date === date)!.kind, 'rest')
    assert.ok(plan.totalWorkMinutes > 0)
  }
  const { plan: polish } = roadmap({ mode: 'polish' })
  const { plan: foundation } = roadmap({ mode: 'foundation' })
  const papersIn = (p: StudyPlan) => tasksOf(p).filter((t) => t.kind === 'timed_paper').length
  assert.ok(papersIn(polish) > papersIn(foundation), 'polish sits more papers than foundation')
  // Component filter: leaves off the chosen paper are not scheduled.
  const tagged: RoadmapSubjectInput = { ...R_MATHS, component: 'Paper 1', signals: R_MATHS.signals!.map((s, i) => ({ ...s, paper: i % 2 === 0 ? 'P1' : 'P3' })) }
  const { plan: p1, pools } = roadmap({ subjects: [tagged] })
  assert.ok(pools['9709']!.every((t) => Number(t.code.split('.')[1]) % 2 === 1), 'only P1 leaves in the pool')
  assert.ok(!workOf(p1).some((t) => t.topic && Number(t.topic.code.split('.')[1]) % 2 === 0))
}

// --- edges ------------------------------------------------------------------------------------------

{
  const none = buildRoadmap({ startDate: START, examDate: START, mode: 'balanced', availabilityDetail: AVAIL, subjects: [R_MATHS] }, { strict: true })
  assert.equal(none.plan.days.length, 0)
  assert.deepEqual(none.pools, {})
  assert.match(none.plan.headline, /today or has passed/)
  const noSubjects = buildRoadmap({ startDate: START, examDate: EXAM_19, mode: 'balanced', availabilityDetail: AVAIL, subjects: [] })
  assert.match(noSubjects.plan.headline, /at least one subject/)
  // No windows at all: the defaults stand in rather than an empty plan.
  const { plan } = roadmap({ availabilityDetail: { ...AVAIL, windows: { weekday: [], weekend: [] } } })
  assert.ok(plan.totalWorkMinutes > 0)
}

// --- the validator catches what the builder must never do --------------------------------------------

{
  const { plan } = roadmap()
  const day = plan.days.find((d) => d.workMinutes > 0)!
  const work = day.blocks.filter((b) => WORK_KINDS.has(b.kind))
  const overlap: StudyPlan = { ...plan, days: plan.days.map((d) => (d === day ? { ...d, blocks: d.blocks.map((b) => (b === work[1] ? { ...b, startsAt: work[0]!.startsAt, endsAt: work[0]!.endsAt } : b)) } : d)) }
  assert.ok(validateRoadmap(overlap).some((e) => /overlaps|outside|out of order/.test(e)), validateRoadmap(overlap).join('; '))
  const wrongSum: StudyPlan = { ...plan, days: plan.days.map((d) => (d === day ? { ...d, workMinutes: d.workMinutes + 5 } : d)) }
  assert.ok(validateRoadmap(wrongSum).some((e) => /workMinutes/.test(e)))
  const late: StudyPlan = { ...plan, subjects: plan.subjects.map((s) => ({ ...s, examDate: START })) }
  assert.ok(validateRoadmap(late).some((e) => /on or after its paper/.test(e)))
  const tooShort: StudyPlan = { ...plan, days: plan.days.map((d) => (d === day ? { ...d, blocks: d.blocks.map((b) => (b === work[0] ? { ...b, minutes: 1 } : b)) } : d)) }
  assert.ok(validateRoadmap(tooShort).some((e) => /under the/.test(e)))
  assert.doesNotThrow(() => buildRoadmap({ startDate: START, examDate: EXAM_19, mode: 'balanced', availabilityDetail: AVAIL, subjects: [R_MATHS] }, { strict: true }), 'strict builds throw only on invalid plans')
}

// --- second pass: the audit's findings, pinned ----------------------------------------------------------
//
// Fixtures shaped like the audit's: a Cambridge subject with named leaves,
// prerequisites, a few frequency lines and a couple of marked topics; an IB
// subject with forty leaves in syllabus order and no short questions.

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const FREQ = { papers: 8, of: 9, from: 'May/June 2024', to: 'Oct/Nov 2025', taggedShare: 0.8, scope: 'component' as const }
const MATHS_NAMES = ['Quadratics', 'Functions', 'Coordinate geometry', 'Circular measure', 'Trigonometry', 'Series', 'Differentiation', 'Integration', 'Binomial expansion', 'Vectors', 'Logarithms', 'Modulus']
const PHYS_NAMES = ['Physical quantities', 'Kinematics', 'Dynamics', 'Forces and density', 'Work, energy and power', 'Deformation of solids', 'Waves', 'Superposition', 'Electricity', 'D.C. circuits']
const cambridge = (
  code: string,
  label: string,
  names: string[],
  opts: { exam: string; rating: RoadmapSubjectInput['selfRating']; freqAt?: number[]; marksAt?: Record<number, { pct: number; attempts: number }>; paper?: string; component?: string; paperMinutes?: number }
): RoadmapSubjectInput => {
  const signals = names.map((name, i) => {
    const extra: Partial<TopicSignals> = { paper: opts.paper ?? 'P1', onNearestPaper: Boolean(opts.component) }
    extra.parentCode = i < names.length / 2 ? 'A' : 'B'
    extra.parentName = i < names.length / 2 ? 'Part A' : 'Part B'
    extra.prerequisiteOf = names.map((_, j) => `${j + 1}`).filter((_, j) => j > i && j < names.length / 2 === i < names.length / 2)
    if (opts.freqAt?.includes(i)) extra.frequency = { ...FREQ, papers: 9 - (i % 3) }
    const m = opts.marksAt?.[i]
    if (m) extra.mastery = { percentage: m.pct, attempts: m.attempts, lastAt: '2026-09-12' }
    return sig(`${i + 1}`, name, i, extra)
  })
  const codes = signals.map((s) => s.code)
  return { code, label, highYield: [], weak: [], hasTimedPaper: true, paperMinutes: opts.paperMinutes ?? 110, examDate: opts.exam, component: opts.component, selfRating: opts.rating, board: 'Cambridge International', qualification: 'A Level', signals, destinations: everywhere(codes) }
}
const IB40 = Array.from({ length: 40 }, (_, i) => `Topic ${String.fromCharCode(65 + Math.floor(i / 8))}${(i % 8) + 1} ${['Water', 'Nucleic acids', 'Origins of cells', 'Cell structure', 'Viruses', 'Diversity', 'Classification', 'Evolution'][i % 8]}`)
const ib = (exam: string): RoadmapSubjectInput => {
  const signals = IB40.map((n, i) => sig(`${String.fromCharCode(65 + Math.floor(i / 8))}${Math.floor(i / 8) + 1}.${(i % 8) + 1}`, n, i, { paper: 'Paper 1' }))
  const codes = signals.map((s) => s.code)
  return { code: 'ib-biology-sl', label: 'Biology SL', highYield: [], weak: [], hasTimedPaper: true, paperMinutes: 90, examDate: exam, selfRating: 'getting_there', board: 'IB', qualification: 'IB Diploma', signals, destinations: { lesson: codes, shortQuestion: [], question: codes } }
}
// Evenings on weekdays, two windows at the weekend; no commitments.
const EVENINGS: RoadmapAvailability = {
  ...DEFAULT_AVAILABILITY,
  weekdayMinutes: 90,
  weekendMinutes: 150,
  sessionLength: 40,
  breakRhythm: 'standard',
  windows: { weekday: [{ start: '16:00', end: '21:00' }], weekend: [{ start: '10:00', end: '13:00' }, { start: '15:00', end: '19:00' }] },
  commitments: [],
}
const TODAY = '2026-09-18' // a Friday
const studyDatesOf = (plan: StudyPlan) => plan.days.filter((d) => d.workMinutes > 0).map((d) => d.date)
const paperDatesOf = (plan: StudyPlan) => plan.days.filter((d) => d.blocks.some((b) => b.taskType === 'timed_paper')).map((d) => d.date)
const minutesOn = (day: StudyPlan['days'][number], subject: string) => day.blocks.filter((b) => b.subjectCode === subject && WORK_KINDS.has(b.kind))

// 1. Single-subject plans fill the day: a leftover opens a topic when the loops cannot move, and mixed practice takes what is left.
{
  const exam = addDays(TODAY, 30)
  const { plan } = buildRoadmap({ startDate: TODAY, examDate: exam, mode: 'balanced', availabilityDetail: { ...EVENINGS, weekendMinutes: 90 }, subjects: [ib(exam)] }, { strict: true })
  assert.ok(plan.days[0]!.workMinutes >= 60, `one subject, 40 leaves, a 90-minute day: day 1 holds ${plan.days[0]!.workMinutes} minutes of work`)
  const grid = buildRoadmap({ startDate: TODAY, examDate: exam, mode: 'balanced', availabilityDetail: EVENINGS, subjects: [ib(exam)] }, { strict: true }).plan
  const capacity = grid.days.reduce((n, d) => n + (d.capacityMinutes ?? 0), 0)
  assert.ok(grid.totalWorkMinutes / capacity >= 0.65, `balanced/40 over 30 days: work is ${(grid.totalWorkMinutes / capacity).toFixed(2)} of capacity`)
  // Leftovers open topics, but never more than a few a day: a day is not five quick checks.
  const firstDate = new Map<string, string>()
  for (const t of workOf(grid)) if (t.topic && !firstDate.has(t.topic.code)) firstDate.set(t.topic.code, t.date)
  for (const d of grid.days) {
    const opened = [...firstDate.values()].filter((date) => date === d.date).length
    assert.ok(opened <= 3, `${d.date} opens ${opened} topics`)
  }
}

// 2. Built late: day 1 is laid from now, or becomes a quiet day that says what tomorrow opens with.
{
  const exam = addDays(TODAY, 19)
  const input: BuildRoadmapInput = { startDate: TODAY, examDate: exam, mode: 'balanced', availabilityDetail: EVENINGS, subjects: [cambridge('9709', 'Mathematics', MATHS_NAMES, { exam, rating: 'rusty', freqAt: [0, 4, 6], marksAt: { 1: { pct: 30, attempts: 4 }, 6: { pct: 80, attempts: 5 } }, component: 'Paper 1' })] }
  const plain = buildRoadmap(input, { strict: true }).plan
  const at2030 = buildRoadmap({ ...input, startMinute: 20 * 60 + 30 }, { strict: true }).plan
  const at2055 = buildRoadmap({ ...input, startMinute: 20 * 60 + 55 }, { strict: true }).plan
  const morning = buildRoadmap({ ...input, startMinute: 8 * 60 }, { strict: true }).plan
  const day1 = (p: StudyPlan) => p.days[0]!
  assert.equal(day1(plain).blocks.find((b) => WORK_KINDS.has(b.kind))!.startsAt, '16:00', 'without a start minute day 1 is laid from the window')
  assert.deepEqual(morning.days, plain.days, 'a start minute before the window changes nothing')
  const late = minutesOn(day1(at2030), '9709')
  assert.ok(late.length >= 1, 'built at 20:30 there is still a task tonight')
  for (const b of late) assert.ok(minuteOfDay(b.startsAt) >= 20 * 60 + 35, `${b.id} starts at ${b.startsAt}, after 20:35`)
  assert.equal(day1(at2030).kind, 'study')
  assert.equal(day1(at2055).kind, 'rest', 'built at 20:55 day 1 is a quiet day')
  assert.equal(day1(at2055).workMinutes, 0)
  const first = at2055.days.find((d) => d.day > 1 && d.workMinutes > 0)!.blocks.find((b) => WORK_KINDS.has(b.kind))!
  assert.equal(day1(at2055).focus, `Built this evening — tomorrow starts with ${first.objective!.replace(/[.]+$/, '')}.`)
  assert.ok(calm(day1(at2055).focus) && !/Rest day/.test(day1(at2055).focus))
  assert.deepEqual(at2055.days.slice(1).map((d) => d.date), plain.days.slice(1).map((d) => d.date), 'the rest of the calendar is unchanged')
  assert.deepEqual(validateRoadmap(at2055), [])
}

// 3. Long plans: reviews keep coming at widening gaps, and mixed sets name the topics they rotate through.
{
  const exam = addDays(TODAY, 90)
  const input: BuildRoadmapInput = {
    startDate: TODAY,
    examDate: exam,
    mode: 'balanced',
    availabilityDetail: { ...EVENINGS, weekdayMinutes: 120, weekendMinutes: 120 },
    subjects: [
      cambridge('9709', 'Mathematics', MATHS_NAMES, { exam, rating: 'rusty', freqAt: [0, 4, 6], marksAt: { 1: { pct: 30, attempts: 4 }, 6: { pct: 80, attempts: 5 } }, component: 'Paper 1' }),
      cambridge('9702', 'Physics', PHYS_NAMES, { exam: addDays(exam, -3), rating: 'getting_there', paper: 'P1/P2', paperMinutes: 75 }),
    ],
  }
  const { plan } = buildRoadmap(input, { strict: true })
  const work = workOf(plan)
  for (const s of plan.subjects) {
    const own = work.filter((t) => t.subjectCode === s.code)
    const provedAt = new Map<string, string>()
    for (const t of own) if (t.loopStep === 'prove' && t.topic && !provedAt.has(t.topic.code)) provedAt.set(t.topic.code, t.date)
    assert.ok(provedAt.size >= 8, `${s.label}: ${provedAt.size} topics proved in 90 days`)
    const taperStart = addDays(s.examDate, -2)
    for (const [code, proved] of provedAt) {
      const name = own.find((t) => t.topic?.code === code)!.topic!.name
      const seen = own.filter((t) => (t.topic?.code === code && t.date > proved) || (t.taskType === 'mixed' && t.objective!.includes(name))).map((t) => t.date)
      const points = [proved, ...seen.filter((d) => d < taperStart), taperStart].sort()
      for (let k = 1; k < points.length; k++) {
        const gap = Math.round((Date.parse(points[k]!) - Date.parse(points[k - 1]!)) / 86_400_000)
        assert.ok(gap <= 21, `${s.label} ${name}: ${gap} days without a review or a named mixed set (${points[k - 1]} → ${points[k]})`)
      }
      const reviews = own.filter((t) => t.topic?.code === code && t.taskType === 'review')
      assert.ok(reviews.length >= 3, `${s.label} ${name} is reviewed ${reviews.length} times, not just twice`)
    }
  }
  const mixed = work.filter((t) => t.taskType === 'mixed')
  const bare = mixed.filter((t) => /across recent topics/.test(t.objective!))
  assert.ok(bare.reduce((n, t) => n + t.minutes, 0) / plan.totalWorkMinutes < 0.3, 'fewer than 30% of work minutes are bare mixed cards')
  const named = mixed.find((t) => !/across recent topics/.test(t.objective!))!
  assert.match(named.objective!, /^Mixed (Mathematics|Physics): .+ and .+ — \d+ minutes, then mark\.$/, named.objective)
  assert.ok(named.why!.length >= 2 && named.why!.some((w) => w.type !== 'mode'), 'a named set carries its topics\' reasons, not only the mode line')
  assert.equal(objectiveFor('mixed', { subject: 'Mathematics', minutes: 25, topics: ['Series', 'Vectors', 'Logarithms'] }), 'Mixed Mathematics: Series, Vectors and Logarithms — 25 minutes, then mark.')
  // 5. Timed papers never sit on consecutive study days, across subjects; the paper-day review is of the paper.
  const studyDates = studyDatesOf(plan)
  const ords = paperDatesOf(plan).map((d) => studyDates.indexOf(d))
  assert.ok(ords.length >= 8, `${ords.length} papers in 90 days`)
  for (let k = 1; k < ords.length; k++) assert.ok(ords[k]! - ords[k - 1]! >= 2, `papers on consecutive study days: ${paperDatesOf(plan)[k - 1]} / ${paperDatesOf(plan)[k]}`)
  const afterPaper = work.filter((t) => t.taskType === 'error_review' && plan.days.find((d) => d.date === t.date)!.blocks.some((b) => b.taskType === 'timed_paper' && b.subjectCode === t.subjectCode))
  assert.ok(afterPaper.length > 0, 'a paper day holds an error review when the day has room')
  for (const t of afterPaper) {
    assert.equal(t.topic, undefined, `${t.id} is about the paper, not a topic`)
    assert.equal(t.objective, `Re-read today's marked ${t.subjectLabel} paper; note which step lost marks most often.`)
    assert.ok(t.why!.every((w) => w.type === 'mode') && t.why!.length === 1, 'its evidence is the paper\'s own')
    assert.match(t.why![0]!.explanation, /timed sittings? for/)
  }
  // 6. The strong loop sleeps on a timed set before reading it back.
  for (const s of plan.subjects) {
    for (const [code, list] of byTopic(plan, s.code)) {
      const proveDates = list.filter((t) => t.loopStep === 'prove').map((t) => t.date)
      const reviewDates = list.filter((t) => t.loopStep === 'review').map((t) => t.date)
      for (const d of proveDates) assert.ok(!reviewDates.includes(d), `${s.label} ${code}: prove and review on ${d}`)
    }
  }
  assert.ok(!JSON.stringify(plan).includes('keeps finding'), 'one set is not a pattern')
  // 10/11. The focus names subjects only; the taper note is no longer a tradeoff.
  for (const d of plan.days) if (d.kind === 'study') assert.ok(!/\d+ tasks?\b/.test(d.focus), `no task count in the focus: ${d.focus}`)
  assert.ok(!plan.feasibility!.tradeoffs.some((l) => /inside a taper/.test(l)))
  for (const t of work) assert.ok(t.why!.length > 0, `${t.id} has a reason`)
}
assert.equal(objectiveFor('error_review', { topic: 'Series', subject: 'Mathematics', minutes: 15 }), 'Re-read your marked Series answers; note which step lost marks.')
assert.ok(STEP_GAP_DAYS.some((r) => r.from === 'prove' && r.to === 'review' && r.minDays === 1), 'prove → review waits a study day')
{
  // A confident subject on the 19-day fixture: a timed set and its error review never share a date.
  const { plan } = roadmap()
  for (const [code, list] of byTopic(plan, '9702')) {
    const prove = list.find((t) => t.loopStep === 'prove')
    const review = list.find((t) => t.loopStep === 'review')
    if (prove && review) assert.ok(review.date > prove.date, `Physics ${code}: the error review waits a day`)
  }
}

// 4. The taper: the eve is light whatever the session, weakest first, and not a copy of the day before.
{
  const eveOf = (plan: StudyPlan, subject: string) => plan.days.filter((d) => d.date < plan.subjects.find((s) => s.code === subject)!.examDate).slice(-2)
  const check = (plan: StudyPlan, subject: string, session: number) => {
    const [before, eve] = eveOf(plan, subject)
    const eveTasks = minutesOn(eve!, subject)
    const beforeTasks = minutesOn(before!, subject)
    assert.ok(eveTasks.reduce((n, b) => n + b.minutes, 0) <= 45, `${subject} eve holds ${eveTasks.reduce((n, b) => n + b.minutes, 0)} minutes`)
    assert.ok(eveTasks.length <= 4, `${subject} eve holds ${eveTasks.length} cards`)
    assert.ok(beforeTasks.reduce((n, b) => n + b.minutes, 0) <= session, `${subject} the day before holds one session at most`)
    assert.ok(eveTasks.every((b) => b.taskType === 'review') && beforeTasks.every((b) => b.taskType === 'review'))
    const eveSet = new Set(eveTasks.map((b) => b.topic?.code))
    const beforeSet = new Set(beforeTasks.map((b) => b.topic?.code))
    assert.ok([...eveSet].some((c) => !beforeSet.has(c)), `${subject}: the eve (${[...eveSet].join(',')}) is not the day before (${[...beforeSet].join(',')}) again`)
    for (const b of [...eveTasks, ...beforeTasks]) assert.ok(b.why!.length > 0, `${b.id} has a reason`)
  }
  const exam30 = addDays(TODAY, 30)
  const polish = buildRoadmap({ startDate: TODAY, examDate: exam30, mode: 'polish', availabilityDetail: { ...EVENINGS, sessionLength: 60 }, subjects: [ib(exam30)] }, { strict: true }).plan
  check(polish, 'ib-biology-sl', 60)
  const { plan } = roadmap()
  check(plan, '9709', AVAIL.sessionLength)
  check(plan, '9702', AVAIL.sessionLength)
  // Weakest first: on the eve the lowest-mastery proved topic comes before a stronger one.
  const pools = buildRoadmap({ startDate: TODAY, examDate: addDays(TODAY, 19), mode: 'balanced', availabilityDetail: EVENINGS, subjects: [cambridge('9709', 'Mathematics', MATHS_NAMES, { exam: addDays(TODAY, 19), rating: 'rusty', freqAt: [0, 4, 6], marksAt: { 1: { pct: 30, attempts: 4 }, 6: { pct: 80, attempts: 5 } }, component: 'Paper 1' })] }, { strict: true })
  const masteryOf = new Map(pools.pools['9709']!.map((t) => [t.code, t.mastery]))
  const eve = eveOf(pools.plan, '9709')[1]!
  const eveOrder = minutesOn(eve, '9709').map((b) => b.topic!.code)
  const proved = new Set(workOf(pools.plan).filter((t) => t.loopStep === 'prove').map((t) => t.topic!.code))
  const provedOnEve = eveOrder.filter((c) => proved.has(c))
  for (let k = 1; k < provedOnEve.length; k++) assert.ok(masteryOf.get(provedOnEve[k - 1]!)! <= masteryOf.get(provedOnEve[k]!)! + 1e-9, `eve order is weakest first: ${provedOnEve.join(' → ')}`)
  // Exam in two days, never-worked topics: every fresh review still has one honest line.
  const two = buildRoadmap({ startDate: TODAY, examDate: addDays(TODAY, 2), mode: 'balanced', availabilityDetail: EVENINGS, subjects: [cambridge('9709', 'Mathematics', MATHS_NAMES, { exam: addDays(TODAY, 2), rating: 'getting_there', freqAt: [0, 4, 6], marksAt: { 1: { pct: 30, attempts: 4 }, 6: { pct: 80, attempts: 5 } }, component: 'Paper 1' })] }, { strict: true }).plan
  const fresh = workOf(two).filter((t) => /check it against the mark scheme/.test(t.objective!))
  assert.ok(fresh.length > 0, 'fresh reviews exist')
  for (const t of fresh) {
    assert.ok(t.why!.length > 0 && t.why!.every((w) => w.type === 'on_syllabus'), `${t.id}: ${JSON.stringify(t.why)}`)
    assert.match(t.why![0]!.explanation, /^On the Cambridge International Mathematics syllabus/)
  }
  assert.deepEqual(validateRoadmap(two), [])
}

// 7. Weekdays off: the copy says so, and the taper is the last two study days, not two empty ones.
{
  const mathsExam = '2026-10-07' // a Wednesday; the two days before it are weekdays with no minutes
  const physicsExam = '2026-10-02' // a Friday
  const input: BuildRoadmapInput = {
    startDate: TODAY,
    examDate: mathsExam,
    mode: 'polish',
    availabilityDetail: { ...EVENINGS, weekdayMinutes: 0, weekendMinutes: 150 },
    subjects: [
      cambridge('9709', 'Mathematics', MATHS_NAMES, { exam: mathsExam, rating: 'getting_there', component: 'Paper 1' }),
      cambridge('9702', 'Physics', PHYS_NAMES, { exam: physicsExam, rating: 'confident', paper: 'P1/P2', paperMinutes: 75 }),
    ],
    blockedDates: ['2026-09-26'],
  }
  const { plan } = buildRoadmap(input, { strict: true })
  const weekdayOff = plan.days.filter((d) => weekdayIndex(d.date) < 5 && d.date !== physicsExam)
  assert.ok(weekdayOff.length >= 10)
  for (const d of weekdayOff) {
    assert.equal(d.kind, 'rest')
    assert.equal(d.focus, 'No study today — weekdays are off in your plan.', d.focus)
  }
  assert.equal(plan.days.find((d) => d.date === '2026-09-26')!.focus, "Rest day — you told us you're away.")
  assert.equal(plan.days.find((d) => d.date === physicsExam)!.focus, 'Physics exam today. Nothing else is scheduled.')
  // Maths sits on Wed 7 Oct: Sat 3 and Sun 4 are its last study days, and they are review only for Maths.
  const lastTwo = ['2026-10-03', '2026-10-04'].map((date) => plan.days.find((d) => d.date === date)!)
  assert.ok(lastTwo.some((d) => minutesOn(d, '9709').length > 0), 'Maths reviews on its last study days')
  for (const d of lastTwo) for (const b of minutesOn(d, '9709')) assert.equal(b.taskType, 'review', `${b.id} is a review`)
  const eve = minutesOn(lastTwo[1]!, '9709')
  assert.ok(eve.length <= 4 && eve.reduce((n, b) => n + b.minutes, 0) <= 45, 'the last study day before the paper is light')
  assert.ok(minutesOn(plan.days.find((d) => d.date === '2026-09-27')!, '9709').some((b) => b.taskType !== 'review'), 'the weekend before is still a study weekend')
  // The two papers are not on consecutive study days even though only six study days exist.
  const studyDates = studyDatesOf(plan)
  const ords = paperDatesOf(plan).map((d) => studyDates.indexOf(d))
  for (let k = 1; k < ords.length; k++) assert.ok(ords[k]! - ords[k - 1]! >= 2, `papers on consecutive study days: ${paperDatesOf(plan).join(', ')}`)
  for (const d of plan.days) assert.ok(calm(d.focus), d.focus)
}

// 8. A subject rated "not started" opens on the lesson, settled, and says why.
{
  const exam = addDays(TODAY, 45)
  const { plan } = buildRoadmap(
    { startDate: TODAY, examDate: exam, mode: 'foundation', availabilityDetail: { ...EVENINGS, weekdayMinutes: 60, weekendMinutes: 120, sessionLength: 20 }, subjects: [cambridge('9702', 'Physics', PHYS_NAMES, { exam, rating: 'not_started', paper: 'P1/P2', paperMinutes: 75 })] },
    { strict: true }
  )
  const physics = workOf(plan).filter((t) => t.subjectCode === '9702' && t.topic)
  assert.ok(physics.length > 0)
  assert.ok(!physics.some((t) => t.taskType === 'diagnostic'), 'no quick check on material never seen')
  for (const [code, list] of byTopic(plan, '9702')) {
    assert.deepEqual([list[0]!.taskType, list[0]!.loopStep], ['concept', 'repair'], `Physics ${code} starts with the lesson`)
    for (const t of list) assert.ok(!t.provisional, `${t.id} is settled: there is no diagnostic to re-branch on`)
    assert.ok(list[0]!.why!.some((w) => w.type === 'mode' && w.explanation === NOT_STARTED_LESSON_LINE), `${code} says why`)
  }
  const entry: TopicPriority = { code: '1', name: 'T', score: 1, why: [{ type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'On the syllabus' }], band: 'must', mastery: 0.15, uncertainty: 1, loop: 'weak' }
  const steps = loopStepsFor(entry, everywhere(['1']), { selfRating: 'not_started' })!
  assert.deepEqual(steps.steps.map((s) => [s.step, s.provisional]), [['repair', false], ['recall', false], ['prove', false]])
  // With a marked answer the rating no longer decides: the usual check applies.
  assert.equal(loopStepsFor({ ...entry, uncertainty: 0.67 }, everywhere(['1']), { selfRating: 'not_started' })!.steps[0]!.step, 'diagnose')
  // Without a lesson to open, the rule does not apply either.
  assert.equal(loopStepsFor(entry, { lesson: [], shortQuestion: ['1'], question: ['1'] }, { selfRating: 'not_started' })!.steps[0]!.step, 'diagnose')
}

// 9. Exam-day and rest-day lines make no claims about the student.
{
  const { plan } = roadmap({ subjects: [{ ...R_MATHS, examDate: '2026-09-25', examTime: '15:00', paperMinutes: 90 }, { ...R_PHYSICS, examDate: '2026-09-26' }] })
  const examDay = plan.days.find((d) => d.date === '2026-09-25')!
  assert.equal(examDay.focus, 'Mathematics exam today. One short Physics review after the paper — only if you feel like it.')
  const rest = plan.days.find((d) => /hold without it/.test(d.focus))
  assert.ok(rest && rest.focus === 'Rest day. The plan is built to hold without it.')
  const text = JSON.stringify(plan.days.map((d) => d.focus))
  for (const claim of ["you've done the work", 'so will you', 'this one is full']) assert.ok(!text.includes(claim), `no "${claim}"`)
  for (const d of plan.days) if (d.kind === 'study') assert.ok(!/\d+ tasks?\b/.test(d.focus), `the summary owns the count: ${d.focus}`)
  assert.ok(plan.days.some((d) => d.focus === 'Mathematics and Physics' || d.focus === 'Physics and Mathematics' || d.focus === 'Mathematics' || d.focus === 'Physics'), 'a study day names its subjects and nothing else')
}

console.log('build-study-plan.test.ts: ok')
