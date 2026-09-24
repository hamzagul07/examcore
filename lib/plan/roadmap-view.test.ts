import assert from 'node:assert/strict'
import { buildStudyPlan, type PlanSubjectInput } from '@/lib/plan/build-study-plan'
import type { HydratedPlan } from '@/lib/plan/plan-view'
import {
  DAY_ONE_LINE,
  clockOf,
  evidenceChip,
  findTask,
  formatClock,
  heroFor,
  minuteOfDay,
  nearestExam,
  nextStudyDay,
  nextTupleOrdinal,
  normaliseDay,
  normaliseRoadmap,
  openLoopsFor,
  remainingToday,
  roadmapStatus,
  stripTaskCount,
  studiedDaysLine,
  tasksOnDate,
  taskIdFor,
  taskStanding,
  type RoadmapDay,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import type { TaskState } from '@/lib/plan/roadmap-types'

const MATHS: PlanSubjectInput = {
  code: '9709',
  label: 'Mathematics',
  highYield: [
    { code: '1.6', name: 'Series', source: 'high_yield', weight: 15 },
    { code: '1.7', name: 'Differentiation', source: 'high_yield', weight: 13 },
  ],
  weak: [],
  hasTimedPaper: true,
}
const PHYSICS: PlanSubjectInput = { code: '9702', label: 'Physics', highYield: [{ code: '9.1', name: 'Kinematics', source: 'high_yield', weight: 14 }], weak: [], hasTimedPaper: true, examDate: '2026-09-25' }

const v2: HydratedPlan = {
  ...buildStudyPlan({ startDate: '2026-09-16', examDate: '2026-10-05', preparedness: 'secure', minutesPerDay: 90, availability: [90, 90, 90, 90, 90, 90, 90], subjects: [MATHS, PHYSICS] }),
  generatedAt: '2026-09-16T07:00:00.000Z',
}
// The v2 builder is frozen at shape v2 apart from the version number; strip the roadmap fields a v2 row never had.
delete (v2 as Partial<HydratedPlan>).mode

// --- clock ----------------------------------------------------------------------------------------

assert.equal(minuteOfDay('16:30'), 990)
assert.equal(minuteOfDay('nope'), 0)
assert.equal(clockOf(990), '16:30')
assert.equal(clockOf(1440), '23:59', 'clamped to the day')
assert.equal(formatClock('16:30'), '4:30 pm')
assert.equal(formatClock('09:00'), '9 am')
assert.equal(taskIdFor('2026-09-16', '9709', '1.6', 2), '2026-09-16-9709-1.6-2')
assert.equal(taskIdFor('2026-09-16', undefined, 'break', 1), '2026-09-16-x-break-1')

// --- normalising a v2 plan --------------------------------------------------------------------------

const plan = normaliseRoadmap(v2)
{
  assert.equal(plan.mode, 'balanced', 'secure reads as balanced')
  assert.equal(plan.algorithmVersion, v2.version)
  assert.equal(plan.revision, 1)
  assert.equal(plan.feasibility, null)
  assert.equal(plan.availabilityDetail, null)
  assert.deepEqual(plan.selfRatings, {})
  assert.deepEqual(
    plan.exams.map((e) => [e.subjectCode, e.examDate]),
    [['9709', '2026-10-05'], ['9702', '2026-09-25']],
    'exams come from the subjects'
  )
  const ids = new Set<string>()
  for (const d of plan.days) {
    assert.equal(d.windows.length, 0, 'a v2 day has no windows')
    assert.equal(d.bufferMinutes, 0)
    assert.equal(d.commitments.length, 0)
    const breaks = d.blocks.filter((b) => b.kind === 'break').reduce((n, b) => n + b.minutes, 0)
    assert.equal(d.capacityMinutes, d.workMinutes + breaks, 'capacity is work plus breaks')
    for (const t of d.blocks) {
      assert.match(t.id, /^\d{4}-\d{2}-\d{2}-[^-]+-.+-\d+$/, `tuple-shaped id: ${t.id}`)
      assert.ok(t.id.startsWith(`${d.date}-`))
      assert.ok(!ids.has(t.id), `ids are unique: ${t.id}`)
      ids.add(t.id)
      assert.equal(t.objective, t.label, 'a v2 label is the objective')
      assert.deepEqual(t.why, [])
      assert.equal(t.priority, 0)
      if (t.kind === 'drill') assert.deepEqual([t.taskType, t.category], ['question', 'practise'])
      if (t.kind === 'review') assert.deepEqual([t.taskType, t.category], ['review', 'review'])
      if (t.kind === 'timed_paper') assert.deepEqual([t.taskType, t.category], ['timed_paper', 'practise'])
      if (t.kind === 'break') assert.deepEqual([t.taskType, t.category], ['break', 'recover'])
      if (t.kind === 'rest') assert.deepEqual([t.taskType, t.category], ['rest', 'recover'])
    }
  }
  // Two drills on the same topic on one day get ordinals 1 and 2; the same input normalises the same way twice.
  const again = normaliseRoadmap(v2)
  assert.deepEqual(again.days.map((d) => d.blocks.map((b) => b.id)), plan.days.map((d) => d.blocks.map((b) => b.id)), 'ids are deterministic')
  const stored = normaliseRoadmap(plan as unknown as HydratedPlan)
  assert.deepEqual(stored.days.map((d) => d.blocks.map((b) => b.id)), plan.days.map((d) => d.blocks.map((b) => b.id)), 'normalising a normalised plan keeps its ids')
}

// --- the hero ---------------------------------------------------------------------------------------

const day1 = plan.days[0]!
const firstTask = day1.blocks.find((b) => b.kind === 'drill')!
const noEvidence = new Set<string>()
{
  const hero = heroFor(plan, day1, {}, noEvidence, 8 * 60)
  assert.equal(hero.kind, 'task')
  if (hero.kind === 'task') {
    assert.equal(hero.task.id, firstTask.id)
    assert.equal(hero.minutes, firstTask.minutes)
    assert.equal(hero.shortened, false)
  }
  const rest = plan.days.find((d) => d.kind === 'rest')!
  assert.equal(heroFor(plan, rest, {}, noEvidence, 8 * 60).kind, 'rest')

  const allDone: TaskState = {}
  for (const t of day1.blocks) if (t.kind === 'drill' || t.kind === 'review' || t.kind === 'timed_paper') allDone[t.id] = { status: 'done', at: 'x' }
  assert.equal(heroFor(plan, day1, allDone, noEvidence, 8 * 60).kind, 'done')

  // With windows, the clock shortens or ends the day.
  const windowed: RoadmapDay = { ...day1, windows: [{ start: '16:00', end: '21:00' }] }
  const late = heroFor(plan, windowed, {}, noEvidence, 20 * 60 + 45)
  assert.equal(late.kind, 'task')
  if (late.kind === 'task') assert.deepEqual([late.minutes, late.shortened], [15, true], '15 minutes left of the window')
  const over = heroFor(plan, windowed, {}, noEvidence, 20 * 60 + 55)
  assert.equal(over.kind, 'no_time')
  if (over.kind === 'no_time') assert.equal(over.nextDate, plan.days[1]!.date)
}

// --- standing and remaining minutes ---------------------------------------------------------------

{
  assert.equal(taskStanding(firstTask, {}, noEvidence), 'todo')
  assert.equal(taskStanding(firstTask, { [firstTask.id]: { status: 'started', at: 'x' } }, noEvidence), 'started')
  assert.equal(taskStanding(firstTask, { [firstTask.id]: { status: 'dropped', at: 'x' } }, noEvidence), 'dropped')
  const key = `t:${firstTask.subjectCode}|${firstTask.topic!.code}`
  assert.equal(taskStanding(firstTask, {}, new Set([key])), 'done', 'a marked answer is done, tick or no tick')

  const open = day1.blocks.filter((b) => b.kind === 'drill' || b.kind === 'review').reduce((n, b) => n + b.minutes, 0)
  assert.equal(remainingToday(day1, {}, noEvidence, 8 * 60), open, 'no windows: the open tasks')
  const windowed: RoadmapDay = { ...day1, windows: [{ start: '16:00', end: '21:00' }] }
  assert.equal(remainingToday(windowed, {}, noEvidence, 20 * 60 + 40), 20, 'clamped by the window')
  assert.equal(remainingToday(windowed, {}, noEvidence, 22 * 60), 0)
  assert.equal(remainingToday(windowed, { [firstTask.id]: { status: 'shortened', at: 'x', minutes: 10 } }, noEvidence, 8 * 60), open - firstTask.minutes + 10, 'a shortened task counts its new length')
}

// --- status and the studied line -----------------------------------------------------------------

{
  const d1 = plan.days[0]!.date
  assert.equal(roadmapStatus(plan, {}, noEvidence, {}, d1), 'on_track', 'day one')
  assert.equal(roadmapStatus({ ...plan, lastDiffDate: d1 }, {}, noEvidence, {}, d1), 'adjusted')
  const past = plan.days.filter((d) => d.workMinutes > 0)
  const fourth = past[3]!.date
  assert.equal(roadmapStatus(plan, {}, noEvidence, {}, fourth), 'reset', 'three study days with nothing done')
  assert.equal(roadmapStatus(plan, {}, noEvidence, { [String(past[1]!.day)]: true }, fourth), 'on_track', 'one tick in the last three is not a reset')
  const doneTask: TaskState = { [past[2]!.blocks.find((b) => b.kind === 'drill')!.id]: { status: 'done', at: 'x' } }
  assert.equal(roadmapStatus(plan, doneTask, noEvidence, {}, fourth), 'on_track', 'a done task counts like a tick')

  assert.equal(studiedDaysLine(plan, {}, noEvidence, {}, d1), DAY_ONE_LINE)
  assert.equal(DAY_ONE_LINE, 'Everything starts today.', 'the header already says "Day 1"; the line does not say it again')
  assert.equal(studiedDaysLine(plan, {}, noEvidence, { [String(past[0]!.day)]: true }, past[1]!.date), "You've studied on 1 of the last 1 day.")
  assert.match(studiedDaysLine(plan, {}, noEvidence, {}, fourth), /^You've studied on 0 of the last 3 days\.$/)
  for (const line of [studiedDaysLine(plan, {}, noEvidence, {}, fourth)]) {
    for (const banned of ['behind', 'missed', 'streak', 'catch up', 'failed', 'everyone else']) assert.ok(!line.toLowerCase().includes(banned), banned)
  }
}

// --- evidence chips --------------------------------------------------------------------------------

{
  assert.equal(evidenceChip({ type: 'self_rated', source: 'self_report', confidence: 'low', explanation: 'x' }), 'From your self-rating')
  assert.equal(evidenceChip({ type: 'frequency', source: 'indexed_papers', confidence: 'medium', explanation: 'x', stat: { n: 9, of: 9 } }), 'In 9 of 9 indexed past papers', 'a count of the past, not a forecast')
  assert.equal(evidenceChip({ type: 'frequency', source: 'indexed_papers', confidence: 'medium', explanation: 'x' }), 'Often in indexed past papers')
  assert.equal(evidenceChip({ type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'x' }), 'On the syllabus')
}

// --- the day's focus line --------------------------------------------------------------------------

{
  // Stored plans wrote the task count into the focus; the day card's summary owns the live count now.
  assert.equal(stripTaskCount('Mathematics and Physics — 5 tasks.'), 'Mathematics and Physics.')
  assert.equal(stripTaskCount('Mathematics — 1 task.'), 'Mathematics.')
  assert.equal(stripTaskCount('Mathematics — 3 tasks; Physics review only.'), 'Mathematics; Physics review only.')
  assert.equal(stripTaskCount('Review only — nothing new from here.'), 'Review only — nothing new from here.', 'other dashes are left alone')
  assert.equal(stripTaskCount('Timed paper day — Mathematics under exam conditions.'), 'Timed paper day — Mathematics under exam conditions.')
  const withCount = normaliseDay({ ...v2.days[0]!, focus: 'Mathematics and Physics — 4 tasks.' })
  assert.equal(withCount.focus, 'Mathematics and Physics.', 'normaliseDay strips it on read')
}

// --- nearest exam ----------------------------------------------------------------------------------

{
  assert.deepEqual(nearestExam(plan, '2026-09-16'), { label: 'Physics', date: '2026-09-25', daysLeft: 9, component: undefined })
  assert.deepEqual(nearestExam(plan, '2026-09-26'), { label: 'Mathematics', date: '2026-10-05', daysLeft: 9, component: undefined })
  assert.equal(nearestExam(plan, '2026-10-06'), null)
}

// --- lookups ---------------------------------------------------------------------------------------

{
  assert.equal(tasksOnDate(plan, day1.date).length, day1.blocks.length)
  assert.deepEqual(tasksOnDate(plan, '2030-01-01'), [])
  const found = findTask(plan, firstTask.id)
  assert.equal(found?.day.date, day1.date)
  assert.equal(found?.index, day1.blocks.indexOf(firstTask))
  assert.equal(findTask(plan, 'nope'), null)

  const topic = firstTask.topic!.code
  const already = day1.blocks.filter((b) => b.subjectCode === firstTask.subjectCode && b.topic?.code === topic).length
  assert.equal(nextTupleOrdinal(day1, day1.date, firstTask.subjectCode, topic), already + 1)
  assert.equal(nextTupleOrdinal(day1, day1.date, '9702', 'zz'), 1)
  // A dropped ordinal is never reused: the ordinal is one past the highest, not the count.
  const sparse: RoadmapDay = { ...day1, blocks: [{ ...firstTask, id: taskIdFor(day1.date, '9709', '1.6', 3) }] }
  assert.equal(nextTupleOrdinal(sparse, day1.date, '9709', '1.6'), 4)

  assert.equal(nextStudyDay(plan, day1.date)?.date, plan.days[1]!.date)
  assert.equal(nextStudyDay(plan, day1.date, plan.days[1]!.date), null, 'nothing before the bound')
  assert.equal(nextStudyDay(plan, plan.days[plan.days.length - 1]!.date), null)

  const loopTask: RoadmapTask = { ...firstTask, loopStep: 'diagnose' }
  const withLoop: RoadmapDay = { ...day1, blocks: [loopTask, { ...firstTask, id: `${firstTask.id}x`, loopStep: 'repair' }] }
  const p = { days: [withLoop] }
  assert.deepEqual([...openLoopsFor(p, {}, noEvidence, '9709', day1.date).keys()], [topic])
  assert.equal(openLoopsFor(p, {}, noEvidence, '9709', day1.date).get(topic)!.length, 2)
  assert.equal(openLoopsFor(p, { [loopTask.id]: { status: 'done', at: 'x' } }, noEvidence, '9709', day1.date).get(topic)!.length, 1, 'a done step is not open')
  assert.equal(openLoopsFor(p, {}, noEvidence, '9709', '2030-01-01').size, 0, 'nothing from a later date')
  assert.equal(openLoopsFor(plan, {}, noEvidence, '9709', day1.date).size, 0, 'v2 blocks carry no loop steps')
  assert.equal(normaliseDay(v2.days[0]!).blocks.length, v2.days[0]!.blocks.length)
}

console.log('roadmap-view.test.ts: ok')
