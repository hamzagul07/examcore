import assert from 'node:assert/strict'
import { buildStudyPlan, type PlanSubjectInput } from '@/lib/plan/build-study-plan'
import type { HydratedPlan } from '@/lib/plan/plan-view'
import {
  DAY_ONE_LINE,
  MAX_ARCHIVE_DAYS,
  archiveFor,
  dayBefore,
  yesterdayLine,
  carryOverTaskState,
  carryable,
  clockOf,
  findArchivedTask,
  historyDayDone,
  historyDays,
  historyTally,
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

// --- history: the days before today, kept across rebuilds ----------------------------------------

{
  const plan = normaliseRoadmap(v2)
  const days = plan.days
  const start = days[3]!.date
  const done = { [String(days[0]!.day)]: true }
  // Everything before the new start with work on it is kept, ticks come along, and a bare rest day is not a record.
  const archive = archiveFor(v2, done, start)
  assert.deepEqual(archive.map((d) => d.date), days.filter((d) => d.date < start && (d.workMinutes > 0 || d.kind === 'exam')).map((d) => d.date))
  assert.ok(archive.every((d) => d.archived === true))
  assert.equal(archive[0]!.ticked, true, 'the tick travels with the day')
  assert.equal(archive[1]!.ticked, undefined)
  // A day whose every task is done (or skipped, with one done) is ticked by its state too; one task of three is not.
  const workOn = (d: RoadmapDay) => d.blocks.filter((b) => b.kind === 'drill' || b.kind === 'learn' || b.kind === 'review' || b.kind === 'timed_paper')
  const allDone: TaskState = {}
  for (const t of workOn(days[1]!)) allDone[t.id] = { status: 'done', at: 'x' }
  assert.equal(archiveFor(v2, {}, start, new Set(), allDone).find((d) => d.date === days[1]!.date)!.ticked, true)
  const oneDone: TaskState = { [workOn(days[1]!)[0]!.id]: { status: 'done', at: 'x' } }
  assert.equal(archiveFor(v2, {}, start, new Set(), oneDone).find((d) => d.date === days[1]!.date)!.ticked, undefined)
  // A second rebuild keeps the earlier archive and adds the days since; a date is never listed twice, and the list is capped.
  const again = archiveFor({ days: days.slice(3), archive }, {}, days[6]!.date)
  assert.deepEqual(again.map((d) => d.date), [...archive.map((d) => d.date), ...days.slice(3, 6).filter((d) => d.workMinutes > 0).map((d) => d.date)])
  const many = Array.from({ length: MAX_ARCHIVE_DAYS + 10 }, (_, i) => ({ ...days[0]!, date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`, archived: true as const }))
  assert.ok(archiveFor({ days: [], archive: many.map((d, i) => ({ ...d, date: `2025-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}` })) }, {}, '2026-01-01').length <= MAX_ARCHIVE_DAYS)
  assert.deepEqual(archiveFor(null, {}, start), [])
  assert.deepEqual(archiveFor(v2, {}, days[0]!.date), [], 'nothing before the first day')

  // The history view: archived days, then the plan's own past days, oldest first; the plan's copy of a date wins.
  const withArchive = { ...plan, archive: [{ ...archive[0]!, blocks: normaliseDay(archive[0]!).blocks, capacityMinutes: 0, bufferMinutes: 0, commitments: [], windows: [] }] }
  const history = historyDays(withArchive, days[5]!.date)
  assert.equal(history[0]!.date, archive[0]!.date)
  assert.ok(history.every((d, i) => i === 0 || d.date > history[i - 1]!.date))
  assert.ok(history.every((d) => d.date < days[5]!.date))
  assert.equal(history.filter((d) => d.date === archive[0]!.date).length, 1, 'no date twice')
  assert.equal(historyDays(plan, days[0]!.date).length, 0)

  // Tally and "studied": facts about the day, from state and marked work.
  const day = days[1]!
  const work = day.blocks.filter((b) => b.kind === 'drill' || b.kind === 'learn' || b.kind === 'review' || b.kind === 'timed_paper')
  const state: TaskState = {
    [work[0]!.id]: { status: 'done', at: 'x' },
    [work[1]!.id]: { status: 'deferred', deferredTo: days[2]!.date, at: 'x' },
    [work[2]!.id]: { status: 'dropped', at: 'x', auto: true },
  }
  const tally = historyTally(day, state, new Set())
  assert.deepEqual(tally, { total: work.length, done: 1, skipped: 0, moved: 1, notDone: work.length - 2 })
  assert.equal(historyDayDone(day, state, new Set(), {}), false, 'one of three done is not a ticked day; the tally says what happened')
  const everyDone: TaskState = {}
  for (const t of work) everyDone[t.id] = { status: 'done', at: 'x' }
  assert.equal(historyDayDone(day, everyDone, new Set(), {}), true)
  assert.equal(historyDayDone(day, {}, new Set(), {}), false)
  assert.equal(historyDayDone(day, {}, new Set(), { [String(day.day)]: true }), true)
  const archived = { ...day, archived: true as const, ticked: true }
  assert.equal(historyDayDone(archived, {}, new Set(), { [String(day.day)]: false }), true, 'an archived day reads its own tick, never done_days')
  assert.equal(historyDayDone({ ...archived, ticked: undefined }, {}, new Set(), { [String(day.day)]: true }), false)
  assert.equal(historyDayDone({ ...archived, ticked: undefined }, everyDone, new Set(), {}), true, 'or its tasks')

  // What may be carried: anything not done and not already moved.
  assert.equal(carryable('todo', undefined), true)
  assert.equal(carryable('started', { status: 'started', at: 'x' }), true)
  assert.equal(carryable('skipped', { status: 'skipped', at: 'x' }), true)
  assert.equal(carryable('dropped', { status: 'dropped', at: 'x', auto: true }), true)
  assert.equal(carryable('done', { status: 'done', at: 'x' }), false)
  assert.equal(carryable('deferred', { status: 'deferred', deferredTo: '2026-10-01', at: 'x' }), false)
  assert.equal(carryable('todo', { status: 'shortened', deferredTo: '2026-10-01', at: 'x' }), false, 'a deferred copy has moved once already')

  // Task state survives a rebuild for the days the archive keeps.
  const oldState: TaskState = { [work[0]!.id]: { status: 'done', at: 'x' }, ['2020-01-01-9709-x-1']: { status: 'done', at: 'x' } }
  const kept = carryOverTaskState(oldState, { days: [], archive: [{ ...day, archived: true }] })
  assert.deepEqual(Object.keys(kept), [work[0]!.id], 'entries on archived days stay; the rest go')
  assert.deepEqual(carryOverTaskState(oldState, { days: [] }), {})
  assert.deepEqual(findArchivedTask({ archive: [{ ...day, archived: true }] }, work[0]!.id)?.task.id, work[0]!.id)
  assert.equal(findArchivedTask({ archive: [] }, work[0]!.id), null)

  // The dashboard's "yesterday" line: the last past study day with something not done, named "Yesterday" only when it was.
  assert.equal(dayBefore('2026-10-01'), '2026-09-30')
  const after = days[2]!.date
  const line = yesterdayLine(plan, state, new Set(), after)
  assert.ok(line && line.date === day.date && line.when === 'Yesterday' && line.done === 1 && line.total === work.length, JSON.stringify(line))
  assert.equal(yesterdayLine(plan, everyDone, new Set(), after), null, 'a day fully done says nothing')
  assert.equal(yesterdayLine(plan, {}, new Set(), days[0]!.date), null, 'a fresh plan says nothing')
  // Two days on, the same day is named by its date, not "Yesterday" — unless the day between held work too.
  const later = yesterdayLine({ days: days.map((d) => (d.date > day.date ? { ...d, workMinutes: 0, blocks: [] } : d)) }, state, new Set(), days[3]!.date)
  assert.ok(later && later.date === day.date && later.when !== 'Yesterday', JSON.stringify(later))
  // Marked work counts as done even without a tick.
  const marked = new Set(work.map((t) => `t:${t.subjectCode}|${t.topic?.code}`))
  assert.equal(yesterdayLine(plan, {}, marked, after), null, 'every question marked: nothing to say')
}

console.log('roadmap-view.test.ts: ok')
