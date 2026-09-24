import assert from 'node:assert/strict'
import { buildRoadmap, buildStudyPlan, validateRoadmap, type RoadmapSubjectInput } from '@/lib/plan/build-study-plan'
import { isCalmCopy } from '@/lib/plan/feasibility'
import { MIN_TASK_MINUTES } from '@/lib/plan/modes'
import { WORK_KINDS, type HydratedPlan } from '@/lib/plan/plan-view'
import { minuteOfDay, normaliseRoadmap, taskIdFor, taskStanding, type RoadmapDay, type RoadmapPlan, type RoadmapTask } from '@/lib/plan/roadmap-view'
import { DEFAULT_AVAILABILITY, MIN_DAY_MINUTES, type RoadmapTodaySummary, type TaskState, type TopicPriority, type TopicSignals } from '@/lib/plan/roadmap-types'
import {
  DURATION_SCALE_MAX,
  REPLAN_NOTHING_LEFT,
  REPLAN_SUMMARY,
  ROLLOVER_SUMMARY,
  applyTaskAction,
  applyUndo,
  availableFeels,
  carryOptions,
  carryTargets,
  letGoLine,
  remainingMinutesAt,
  replanToday,
  rolloverDay,
  storedSummaryServes,
  todaySummaryFor,
  undoDates,
  undoSnapshotFor,
  type ActionContext,
} from '@/lib/plan/task-actions'
import type { TaskStateEntry } from '@/lib/plan/roadmap-types'

const isSettledEntry = (e: TaskStateEntry | undefined) => e?.status === 'done' || e?.status === 'skipped' || e?.status === 'deferred' || e?.status === 'dropped'

const START = '2026-09-16'
const EXAM = '2026-10-05'
const sig = (code: string, name: string, order: number, extra: Partial<TopicSignals> = {}): TopicSignals => ({ code, name, order, coreWeight: 1, ...extra })
const codesOf = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}.${i + 1}`)
const MATHS: RoadmapSubjectInput = {
  code: '9709',
  label: 'Mathematics',
  highYield: [],
  weak: [],
  hasTimedPaper: true,
  paperMinutes: 105,
  signals: codesOf(8, '1').map((c, i) => sig(c, `Maths ${c}`, i)),
  destinations: { lesson: codesOf(8, '1'), shortQuestion: codesOf(8, '1'), question: codesOf(8, '1') },
  selfRating: 'rusty',
}
const PHYSICS: RoadmapSubjectInput = {
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

const built = buildRoadmap({ startDate: START, examDate: EXAM, mode: 'balanced', availabilityDetail: DEFAULT_AVAILABILITY, subjects: [MATHS, PHYSICS] }, { strict: true })
const hydrated: HydratedPlan = { ...built.plan, generatedAt: '2026-09-16T07:00:00.000Z' }
const pools: Record<string, TopicPriority[]> = built.pools
const P0 = normaliseRoadmap(hydrated)
const none = new Set<string>()
const ctx: ActionContext = { now: '2026-09-16T11:05:00.000Z', todayIso: START, nowMinute: 16 * 60 + 5, evidence: none }

const day1 = P0.days[0]!
const work = (day: { blocks: RoadmapTask[] }) => day.blocks.filter((b) => WORK_KINDS.has(b.kind))
const t1 = work(day1)[0]!
const t2 = work(day1)[1]!
const t3 = work(day1)[2]!
assert.ok(t1 && t2 && t3, 'day one has at least three tasks')
const req = (taskId: string, action: Parameters<typeof applyTaskAction>[3]['action'], extra: Partial<Parameters<typeof applyTaskAction>[3]> = {}) => ({ taskId, action, revision: 1, ...extra })
const calm = (s: string) => isCalmCopy(s)
// After an action a deferred loop step may sit after its successors; the clock invariants must still hold.
const clockErrors = (plan: RoadmapPlan) => validateRoadmap(plan).filter((e) => !/out of order/.test(e))

// --- start / complete / skip: the transition table, with no-ops ---------------------------------

{
  const started = applyTaskAction(P0, {}, pools, req(t1.id, 'start'), ctx)
  assert.equal(started.noop, false)
  assert.equal(started.taskState[t1.id]!.status, 'started')
  assert.deepEqual([started.event?.type, started.event?.plannedMinutes], ['task_started', t1.minutes])
  assert.deepEqual(started.changedDates, [day1.date])
  const again = applyTaskAction(started.plan, started.taskState, pools, req(t1.id, 'start'), ctx)
  assert.equal(again.noop, true)
  assert.equal(again.event, undefined, 'a no-op writes no event')
  assert.deepEqual(again.taskState, started.taskState)

  const done = applyTaskAction(started.plan, started.taskState, pools, req(t1.id, 'complete', { actualMinutes: 14 }), ctx)
  assert.deepEqual([done.taskState[t1.id]!.status, done.taskState[t1.id]!.actualMinutes], ['done', 14])
  assert.deepEqual([done.event?.type, done.event?.plannedMinutes, done.event?.actualMinutes], ['task_completed', t1.minutes, 14])
  const twice = applyTaskAction(done.plan, done.taskState, pools, req(t1.id, 'complete', { actualMinutes: 14 }), ctx)
  assert.equal(twice.noop, true)
  assert.deepEqual(twice.taskState, done.taskState, 'completing twice is the same state')
  assert.deepEqual(twice.plan, done.plan)
  assert.equal(applyTaskAction(P0, {}, pools, req(t2.id, 'complete'), ctx).taskState[t2.id]!.status, 'done', 'todo → done directly')
  assert.equal(applyTaskAction(done.plan, done.taskState, pools, req(t1.id, 'start'), ctx).noop, true, 'a done task cannot be started')
  assert.equal(applyTaskAction(done.plan, done.taskState, pools, req(t1.id, 'skip'), ctx).noop, true, 'a done task cannot be skipped')

  const skipped = applyTaskAction(P0, {}, pools, req(t2.id, 'skip', { reason: 'no energy' }), ctx)
  assert.deepEqual([skipped.taskState[t2.id]!.status, skipped.taskState[t2.id]!.reason], ['skipped', 'no energy'])
  assert.deepEqual([skipped.event?.type, skipped.event?.reason], ['task_skipped', 'no energy'])
  assert.equal(applyTaskAction(skipped.plan, skipped.taskState, pools, req(t2.id, 'skip'), ctx).noop, true)
  assert.equal(applyTaskAction(skipped.plan, skipped.taskState, pools, req(t2.id, 'complete'), ctx).noop, true, 'skipped is settled')
  assert.equal(applyTaskAction(P0, {}, pools, req('nope', 'start'), ctx).noop, true)
  const brk = day1.blocks.find((b) => b.kind === 'break')!
  assert.equal(applyTaskAction(P0, {}, pools, req(brk.id, 'complete'), ctx).noop, true, 'a break is not a task')
}

// --- shorten -------------------------------------------------------------------------------------

{
  const question = P0.days.flatMap((d) => work(d)).find((t) => t.taskType === 'question' && t.minutes === 20)!
  const r = applyTaskAction(P0, {}, pools, req(question.id, 'shorten', { minutes: 12 }), ctx)
  assert.equal(r.noop, false)
  assert.deepEqual([r.taskState[question.id]!.status, r.taskState[question.id]!.minutes], ['shortened', MIN_TASK_MINUTES.question], 'never under the floor')
  const after = r.plan.days.flatMap((d) => d.blocks).find((b) => b.id === question.id)!
  assert.equal(after.minutes, 15)
  assert.equal(minuteOfDay(after.endsAt) - minuteOfDay(after.startsAt), 15, 'endsAt recomputed')
  assert.equal(after.startsAt, question.startsAt, 'startsAt untouched')
  assert.equal(r.diff?.changes[0]?.kind, 'shortened')
  assert.equal(r.event?.type, 'task_shortened')
  const day = r.plan.days.find((d) => d.blocks.some((b) => b.id === question.id))!
  assert.equal(day.workMinutes, day.blocks.filter((b) => WORK_KINDS.has(b.kind)).reduce((n, b) => n + b.minutes, 0))
  assert.equal(applyTaskAction(r.plan, r.taskState, pools, req(question.id, 'shorten', { minutes: 15 }), ctx).noop, true, 'already at its floor')
  const half = applyTaskAction(P0, {}, pools, req(question.id, 'shorten'), ctx)
  assert.equal(half.taskState[question.id]!.minutes, 15, 'half of 20 is under the floor, so the floor')
  const done = applyTaskAction(P0, {}, pools, req(question.id, 'complete'), ctx)
  assert.equal(applyTaskAction(done.plan, done.taskState, pools, req(question.id, 'shorten', { minutes: 15 }), ctx).noop, true)
  // A started task shortened (or swapped) stays started — still protected from replans.
  const going = applyTaskAction(P0, {}, pools, req(question.id, 'start'), ctx)
  const shorter = applyTaskAction(going.plan, going.taskState, pools, req(question.id, 'shorten', { minutes: 15 }), ctx)
  assert.deepEqual([shorter.taskState[question.id]!.status, shorter.taskState[question.id]!.minutes], ['started', 15])
  assert.equal(taskStanding(question, shorter.taskState, none), 'started')
  const goingT1 = applyTaskAction(P0, {}, pools, req(t1.id, 'start'), ctx)
  const swappedStarted = applyTaskAction(goingT1.plan, goingT1.taskState, pools, req(t1.id, 'swap'), ctx)
  const swappedId = Object.keys(swappedStarted.taskState).find((id) => swappedStarted.taskState[id]!.swappedFrom)!
  assert.equal(swappedStarted.taskState[swappedId]!.status, 'started')
  assert.equal(applyTaskAction(P0, {}, pools, req(t1.id, 'start'), ctx).structural, false, 'a start keeps the revision')
  assert.equal(applyTaskAction(P0, {}, pools, req(t1.id, 'complete'), ctx).structural, false)
  assert.equal(applyTaskAction(P0, {}, pools, req(t1.id, 'skip'), ctx).structural, false)
}

// --- defer: once, into time in hand, shortened to the floor; otherwise let go --------------------

{
  const r = applyTaskAction(P0, {}, pools, req(t3.id, 'defer'), ctx)
  assert.equal(r.noop, false)
  const entry = r.taskState[t3.id]!
  assert.equal(entry.status, 'deferred')
  assert.ok(entry.deferredTo && entry.deferredTo > day1.date, 'moved forward')
  const target = r.plan.days.find((d) => d.date === entry.deferredTo)!
  const copy = target.blocks.find((b) => b.id !== t3.id && b.subjectCode === t3.subjectCode && b.topic?.code === t3.topic?.code && b.taskType === t3.taskType && b.objective === t3.objective)!
  assert.ok(copy, 'a copy landed on the target day')
  assert.equal(copy.href, undefined, 'the copy forgets the original link (it carried the old task id)')
  assert.deepEqual(r.needsHydration, [copy.id], 'and is hydrated afresh')
  assert.equal(r.structural, true)
  assert.equal(copy.minutes, MIN_TASK_MINUTES[t3.taskType], 'shortened to its floor')
  assert.match(copy.id, new RegExp(`^${target.date}-${t3.subjectCode}-`))
  assert.equal(r.taskState[copy.id]!.deferredTo, target.date, 'the copy knows it was deferred')
  assert.equal(taskStanding(copy, r.taskState, none), 'todo', 'the copy is still to do')
  assert.equal(copy.provisional, t3.provisional, 'the provisional flag travels')
  assert.ok(target.bufferMinutes <= P0.days.find((d) => d.date === target.date)!.bufferMinutes - copy.minutes, 'it came out of time in hand')
  assert.equal(target.workMinutes, target.blocks.filter((b) => WORK_KINDS.has(b.kind)).reduce((n, b) => n + b.minutes, 0))
  assert.deepEqual(r.changedDates, [day1.date, target.date])
  assert.equal(r.diff?.changes[0]?.kind, 'moved')
  assert.deepEqual([r.event?.type, r.event?.meta?.to], ['task_deferred', target.date])
  assert.deepEqual(clockErrors(r.plan), [], 'no overlap, nothing outside a window, every sum right after a defer')
  assert.equal(applyTaskAction(r.plan, r.taskState, pools, req(t3.id, 'defer'), ctx).noop, true, 'never twice')
  assert.equal(applyTaskAction(r.plan, r.taskState, pools, req(copy.id, 'defer'), ctx).noop, true, 'the copy can never be deferred')
  assert.equal(applyTaskAction(r.plan, r.taskState, pools, req(copy.id, 'complete'), ctx).taskState[copy.id]!.status, 'done', 'but it can be done')

  // No room anywhere: let go, calmly.
  const full: RoadmapPlan = { ...P0, days: P0.days.map((d) => (d.date > day1.date ? { ...d, bufferMinutes: 0 } : d)) }
  const dropped = applyTaskAction(full, {}, pools, req(t3.id, 'defer'), ctx)
  assert.equal(dropped.taskState[t3.id]!.status, 'dropped')
  assert.equal(dropped.taskState[t3.id]!.deferredTo, undefined)
  assert.deepEqual([dropped.diff?.changes[0]?.kind, dropped.diff?.changes[0]?.detail], ['dropped', letGoLine(t3.label)])
  assert.ok(calm(letGoLine(t3.label)))
}

// --- swap ----------------------------------------------------------------------------------------

{
  const r = applyTaskAction(P0, {}, pools, req(t1.id, 'swap'), ctx)
  assert.equal(r.noop, false)
  const day = r.plan.days[0]!
  const swapped = day.blocks[day1.blocks.indexOf(t1)]!
  assert.notEqual(swapped.id, t1.id)
  assert.deepEqual([swapped.taskType, swapped.minutes, swapped.startsAt, swapped.endsAt, swapped.subjectCode], [t1.taskType, t1.minutes, t1.startsAt, t1.endsAt, t1.subjectCode])
  assert.notEqual(swapped.topic!.code, t1.topic!.code)
  assert.ok(!day1.blocks.some((b) => b.topic?.code === swapped.topic!.code), 'the new topic was not already on that day')
  assert.ok(pools[t1.subjectCode!]!.some((p) => p.code === swapped.topic!.code), 'from the pool')
  assert.ok(swapped.objective.includes(swapped.topic!.name), 'the objective names the new topic')
  assert.deepEqual([r.taskState[swapped.id]!.status, r.taskState[swapped.id]!.swappedFrom], ['swapped', t1.topic!.code])
  assert.equal(r.taskState[t1.id], undefined, 'the old id leaves the state')
  assert.deepEqual(r.needsHydration, [swapped.id])
  assert.equal(r.event?.type, 'task_swapped')
  assert.equal(taskStanding(swapped, r.taskState, none), 'todo')
  assert.ok(!day.blocks.some((b) => b.id === t1.id))
}

// --- pin / unpin ----------------------------------------------------------------------------------

{
  const pinned = applyTaskAction(P0, {}, pools, req(t2.id, 'pin'), ctx)
  assert.equal(pinned.plan.days[0]!.blocks.find((b) => b.id === t2.id)!.pinned, true)
  assert.equal(pinned.event, undefined)
  assert.equal(applyTaskAction(pinned.plan, {}, pools, req(t2.id, 'pin'), ctx).noop, true)
  const un = applyTaskAction(pinned.plan, {}, pools, req(t2.id, 'unpin'), ctx)
  assert.equal(un.plan.days[0]!.blocks.find((b) => b.id === t2.id)!.pinned, undefined)
  assert.equal(applyTaskAction(P0, {}, pools, req(t2.id, 'unpin'), ctx).noop, true)
}

// --- check-ins: every feeling does something defined ----------------------------------------------

{
  const diag = P0.days.flatMap((d) => work(d)).find((t) => t.loopStep === 'diagnose' && t.subjectCode === '9709')!
  const topic = diag.topic!.code
  const later = P0.days.flatMap((d) => work(d)).filter((t) => t.subjectCode === '9709' && t.topic?.code === topic && (t.loopStep === 'repair' || t.loopStep === 'recall'))
  assert.ok(later.length >= 1, 'the topic has repair or recall steps ahead')

  // about_right: nothing changes, the feeling is recorded, an event is written.
  const done = applyTaskAction(P0, {}, pools, req(diag.id, 'complete'), ctx)
  const fine = applyTaskAction(done.plan, done.taskState, pools, req(diag.id, 'checkin', { feel: 'about_right' }), ctx)
  assert.deepEqual([fine.noop, fine.diff, fine.taskState[diag.id]!.feel, fine.taskState[diag.id]!.status], [false, undefined, 'about_right', 'done'])
  assert.deepEqual([fine.event?.type, fine.event?.feel], ['task_checkin', 'about_right'])
  assert.equal(fine.plan.lastDiffDate, undefined)
  assert.equal(applyTaskAction(done.plan, done.taskState, pools, req(diag.id, 'checkin'), ctx).noop, true, 'no feeling, no change')

  // too_easy: the repair steps go, the marked question stays, the pool learns.
  const easy = applyTaskAction(done.plan, done.taskState, pools, req(diag.id, 'checkin', { feel: 'too_easy' }), ctx)
  for (const t of later) assert.equal(easy.taskState[t.id]!.status, 'dropped', `${t.id} dropped`)
  assert.ok(easy.diff!.changes.every((c) => c.kind === 'dropped'))
  assert.equal(easy.diff!.changes.length, later.length)
  const prove = P0.days.flatMap((d) => work(d)).find((t) => t.subjectCode === '9709' && t.topic?.code === topic && t.loopStep === 'prove')
  if (prove) assert.equal(easy.taskState[prove.id], undefined, 'the proof stays')
  assert.ok(easy.pools['9709']!.find((p) => p.code === topic)!.mastery >= 0.7)
  assert.equal(pools['9709']!.find((p) => p.code === topic)!.mastery < 0.7, true, 'the input pools are untouched')
  assert.equal(easy.plan.lastDiffDate, START)
  for (const c of easy.diff!.changes) assert.ok(calm(c.detail ?? ''))

  // too_hard on a diagnostic: a concept refresh goes first on the next study day.
  const hard = applyTaskAction(done.plan, done.taskState, pools, req(diag.id, 'checkin', { feel: 'too_hard' }), ctx)
  const inserted = hard.diff!.changes.find((c) => c.kind === 'inserted')!
  assert.ok(inserted, 'a concept task was inserted')
  assert.equal(hard.needsHydration.length, 1)
  assert.equal(hard.needsHydration[0], inserted.taskId)
  const nextDay = hard.plan.days.find((d) => d.date > START && d.workMinutes > 0)!
  const firstWork = work(nextDay)[0]!
  assert.equal(firstWork.id, inserted.taskId, 'first thing on the next study day')
  assert.deepEqual([firstWork.taskType, firstWork.topic!.code, firstWork.subjectCode], ['concept', topic, '9709'])
  assert.equal(firstWork.startsAt, nextDay.windows[0]!.start, 'at the top of the first window')
  assert.ok(hard.changedDates.includes(nextDay.date))
  assert.equal(nextDay.workMinutes, nextDay.blocks.filter((b) => WORK_KINDS.has(b.kind)).reduce((n, b) => n + b.minutes, 0))
  const timed = nextDay.blocks.filter((b) => b.startsAt).sort((a, b) => minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
  for (let k = 1; k < timed.length; k++) assert.ok(minuteOfDay(timed[k]!.startsAt) >= minuteOfDay(timed[k - 1]!.endsAt), 'no overlap after the shift')
  const before = P0.days.find((d) => d.date === nextDay.date)!
  const shifted = hard.diff!.changes.filter((c) => c.kind === 'moved' || c.kind === 'dropped')
  assert.ok(shifted.length >= 1, 'the rest of the day shifted or a task dropped')
  const droppedCount = hard.diff!.changes.filter((c) => c.kind === 'dropped').length
  assert.equal(work(nextDay).length, work(before).length + 1 - droppedCount, 'the concept is added; only what no longer fits is let go, and the diff names it')
  assert.equal(hard.plan.lastDiffDate, START)
  // too_hard and need_help insert the refresh on any step with a topic — the sheet promises it for every task it shows the feeling on.
  const repair = later.find((t) => t.loopStep === 'repair')
  if (repair) {
    assert.ok(applyTaskAction(P0, {}, pools, req(repair.id, 'checkin', { feel: 'too_hard' }), ctx).diff!.changes.some((c) => c.kind === 'inserted'))
    assert.ok(applyTaskAction(P0, {}, pools, req(repair.id, 'checkin', { feel: 'need_help' }), ctx).diff!.changes.some((c) => c.kind === 'inserted'))
  }
  // A check-in on a task still to do completes it and says so in a second event; the revision does not move for a plain one.
  const early = applyTaskAction(P0, {}, pools, req(t2.id, 'checkin', { feel: 'about_right' }), ctx)
  assert.equal(early.taskState[t2.id]!.status, 'done')
  assert.deepEqual(early.extraEvents?.map((e) => [e.type, e.meta?.byCheckin]), [['task_completed', true]])
  assert.equal(early.structural, false)
  assert.equal(fine.structural, false)
  assert.equal(hard.structural, true)
  assert.equal(easy.structural, true)

  // took_longer: the type stretches by 1.25 each time, capped at 1.5; future tasks grow into their slots.
  const question = P0.days.flatMap((d) => work(d)).find((t) => t.taskType === 'question')!
  const longer = applyTaskAction(P0, {}, pools, req(question.id, 'checkin', { feel: 'took_longer', actualMinutes: 35 }), ctx)
  assert.equal(longer.plan.durationScale?.question, 1.25)
  const resized = longer.diff!.changes.filter((c) => c.kind === 'resized')
  assert.ok(resized.length >= 1, 'some future question grew')
  for (const c of resized) {
    const was = P0.days.flatMap((d) => d.blocks).find((b) => b.id === c.taskId)!
    const now = longer.plan.days.flatMap((d) => d.blocks).find((b) => b.id === c.taskId)!
    assert.ok(now.minutes > was.minutes && now.minutes <= 25, `${c.taskId}: ${was.minutes} → ${now.minutes}`)
    assert.equal(minuteOfDay(now.endsAt) - minuteOfDay(now.startsAt), now.minutes)
  }
  assert.deepEqual(clockErrors(longer.plan), [], 'resized tasks still fit their windows and never overlap')
  const twice = applyTaskAction(longer.plan, longer.taskState, pools, req(question.id, 'checkin', { feel: 'took_longer' }), ctx)
  const thrice = applyTaskAction(twice.plan, twice.taskState, pools, req(question.id, 'checkin', { feel: 'took_longer' }), ctx)
  assert.equal(thrice.plan.durationScale?.question, DURATION_SCALE_MAX, 'capped')

  // was_busy on a task still to do is a defer of that task; it is not completed by the check-in.
  const busy = applyTaskAction(P0, {}, pools, req(t3.id, 'checkin', { feel: 'was_busy' }), ctx)
  assert.deepEqual([busy.taskState[t3.id]!.status, busy.taskState[t3.id]!.feel], ['deferred', 'was_busy'])
  assert.ok(busy.taskState[t3.id]!.deferredTo)
  assert.equal(busy.diff!.changes[0]!.kind, 'moved')
  assert.equal(busy.event?.feel, 'was_busy')
  assert.equal(busy.extraEvents, undefined)
  // was_busy on a DONE task (the sheet opens after Done) moves the topic's next open step today, so the promise holds.
  const sameTopic = work(day1).find((t) => t.id !== diag.id && t.subjectCode === diag.subjectCode && t.topic?.code === topic)
  if (sameTopic) {
    const busyDone = applyTaskAction(done.plan, done.taskState, pools, req(diag.id, 'checkin', { feel: 'was_busy' }), ctx)
    assert.equal(busyDone.taskState[diag.id]!.status, 'done', 'the finished task stays done')
    assert.equal(busyDone.taskState[sameTopic.id]!.status, 'deferred', "the topic's next step moved")
    assert.ok(busyDone.diff!.changes.some((c) => c.taskId === sameTopic.id && c.kind === 'moved'))
    assert.ok(busyDone.needsHydration.length === 1, 'the moved copy is hydrated afresh')
  }
  // The sheet only offers feelings the reducer will act on.
  const offered = availableFeels(done.plan, diag, done.taskState, none, START)
  assert.ok(offered.includes('about_right') && offered.includes('took_longer') && offered.includes('too_hard') && offered.includes('need_help'))
  assert.equal(offered.includes('too_easy'), later.some((t) => !isSettledEntry(done.taskState[t.id])), 'too_easy only while a repair or recall step is ahead')
  assert.equal(offered.includes('was_busy'), Boolean(sameTopic), 'was_busy only when something of this topic can still move')
  const paperTask = P0.days.flatMap((d) => work(d)).find((t) => t.taskType === 'timed_paper')
  if (paperTask) {
    assert.deepEqual(availableFeels(P0, paperTask, {}, none, START), ['about_right', 'took_longer', 'was_busy'], 'a paper still to do can move; it has no topic to repair')
    const sat = applyTaskAction(P0, {}, pools, req(paperTask.id, 'complete'), ctx)
    assert.deepEqual(availableFeels(sat.plan, paperTask, sat.taskState, none, START), ['about_right', 'took_longer'], 'a sat paper has nothing left to move')
  }
}

// --- replan today: protected tasks byte-identical, the rest re-laid from now ---------------------

{
  let plan: RoadmapPlan = P0
  let state: TaskState = {}
  const a = applyTaskAction(plan, state, pools, req(t1.id, 'complete'), ctx)
  const b = applyTaskAction(a.plan, a.taskState, pools, req(t2.id, 'start'), ctx)
  const c = applyTaskAction(b.plan, b.taskState, pools, req(t3.id, 'pin'), ctx)
  plan = c.plan
  state = c.taskState
  const protectedBefore = plan.days[0]!.blocks.filter((x) => [t1.id, t2.id, t3.id].includes(x.id))
  const nowMinute = minuteOfDay(t3.endsAt) + 3
  const r = replanToday(plan, state, pools, { date: day1.date, nowMinute, evidence: none })
  assert.equal(r.diff.summary, REPLAN_SUMMARY)
  assert.deepEqual(r.diff.protectedTaskIds.sort(), [t1.id, t2.id, t3.id].sort())
  assert.equal(r.plan.lastDiffDate, day1.date)
  assert.equal(r.plan.revision, plan.revision, 'the route bumps the revision, not the reducer')
  const day = r.plan.days[0]!
  const protectedAfter = day.blocks.filter((x) => [t1.id, t2.id, t3.id].includes(x.id))
  assert.deepEqual(protectedAfter, protectedBefore, 'done, started and pinned tasks are byte-identical')
  for (const x of work(day)) {
    if ([t1.id, t2.id, t3.id].includes(x.id)) continue
    assert.ok(minuteOfDay(x.startsAt) >= nowMinute, `${x.id} is laid from now (${x.startsAt})`)
    assert.ok(x.minutes >= MIN_TASK_MINUTES[x.taskType])
  }
  assert.equal(day.workMinutes, work(day).reduce((n, x) => n + x.minutes, 0))
  assert.deepEqual(clockErrors(r.plan), [], 'a replanned day still holds every clock invariant')
  for (const ch of r.diff.changes) assert.ok(['kept', 'moved', 'shortened', 'dropped'].includes(ch.kind))
  assert.ok(r.diff.changes.some((ch) => ch.kind === 'kept'))
  const highest = work(day1).filter((x) => ![t1.id, t2.id, t3.id].includes(x.id)).sort((x, y) => y.priority - x.priority)[0]
  if (highest) assert.ok(day.blocks.some((x) => x.id === highest.id), 'the highest-priority open task survives')
  // The same request applied to its own result changes nothing that matters.
  const r2 = replanToday(r.plan, r.taskState, pools, { date: day1.date, nowMinute, evidence: none })
  assert.deepEqual(r2.plan.days[0]!.blocks.filter((x) => WORK_KINDS.has(x.kind)).map((x) => [x.id, x.startsAt, x.minutes]), day.blocks.filter((x) => WORK_KINDS.has(x.kind)).map((x) => [x.id, x.startsAt, x.minutes]))

  // A hard cap on minutes left.
  const capped = replanToday(plan, state, pools, { date: day1.date, nowMinute, minutesLeft: 20, evidence: none })
  const laid = work(capped.plan.days[0]!).filter((x) => ![t1.id, t2.id, t3.id].includes(x.id))
  assert.ok(laid.reduce((n, x) => n + x.minutes, 0) <= 20, 'at most the minutes the student has')

  // 23:50: no window left. A replan would only let everything go, so it declines calmly and changes nothing.
  const late = replanToday(plan, state, pools, { date: day1.date, nowMinute: 23 * 60 + 50, evidence: none })
  const open = work(day1).filter((x) => ![t1.id, t2.id, t3.id].includes(x.id))
  assert.ok(open.length > 0)
  assert.equal(late.noop, true)
  assert.deepEqual(late.diff.changes, [])
  assert.equal(late.diff.summary, REPLAN_NOTHING_LEFT)
  assert.ok(calm(REPLAN_NOTHING_LEFT))
  assert.deepEqual(late.plan.days[0]!.blocks, plan.days[0]!.blocks, 'nothing moved')
  assert.equal(late.plan.lastDiffDate, plan.lastDiffDate)
  for (const x of open) assert.notEqual(late.taskState[x.id]?.status, 'dropped')
  // Ten minutes left holds one floor-length task; the rest is let go and the diff says which.
  const tenLeft = replanToday(plan, state, pools, { date: day1.date, nowMinute, minutesLeft: 10, evidence: none })
  assert.equal(tenLeft.noop, false)
  assert.ok(tenLeft.diff.changes.some((ch) => ch.kind === 'dropped' && ch.detail === letGoLine(work(day1).find((x) => x.id === ch.taskId)!.label)))
  // A date outside the plan is a no-op with an empty diff.
  assert.deepEqual(replanToday(plan, state, pools, { date: '2030-01-01', nowMinute: 0, evidence: none }).diff.changes, [])
}

// --- undo round-trips a day ------------------------------------------------------------------------

{
  const a = applyTaskAction(P0, {}, pools, req(t1.id, 'complete'), ctx)
  const snap = undoSnapshotFor(a.plan, a.taskState, day1.date, 'before the replan')
  assert.deepEqual([snap.date, snap.revision, snap.summary, snap.workMinutes, snap.focus], [day1.date, 1, 'before the replan', day1.workMinutes, day1.focus])
  assert.deepEqual(Object.keys(snap.taskStateForDay), [t1.id])
  assert.ok(JSON.stringify(snap).length < 12_000, `a day snapshot stays small: ${JSON.stringify(snap).length}`)
  const r = replanToday(a.plan, a.taskState, pools, { date: day1.date, nowMinute: minuteOfDay(t1.endsAt) + 1, minutesLeft: 10, evidence: none })
  assert.notDeepEqual(r.plan.days[0]!.blocks, a.plan.days[0]!.blocks)
  const back = applyUndo(r.plan, r.taskState, snap)
  assert.deepEqual(back.plan.days[0]!.blocks, a.plan.days[0]!.blocks)
  assert.deepEqual(back.plan.days[0]!.workMinutes, a.plan.days[0]!.workMinutes)
  assert.deepEqual(back.taskState, a.taskState, 'the dropped entries are gone, the done one is back')
  assert.deepEqual(back.plan.days.slice(1), r.plan.days.slice(1), 'other days untouched')
  assert.equal(back.plan.lastDiffDate, undefined, 'the "Adjusted today" mark goes with the change it marked')
  assert.equal(back.plan.lastDiff, undefined)
  assert.ok(r.plan.lastDiff, 'the replan keeps its diff on the plan for the next page load')

  // A defer touches two days: the snapshot covers both, and undoing it leaves no copy behind.
  const deferred = applyTaskAction(P0, {}, pools, req(t3.id, 'defer'), ctx)
  const to = deferred.taskState[t3.id]!.deferredTo!
  const dsnap = undoSnapshotFor(P0, {}, deferred.diff!.date, deferred.diff!.summary, deferred.changedDates)
  assert.deepEqual(undoDates(dsnap), [day1.date, to])
  const dback = applyUndo(deferred.plan, deferred.taskState, dsnap)
  assert.deepEqual(dback.plan.days, P0.days, 'both days are as they were')
  assert.deepEqual(dback.taskState, {}, 'the original is to do again and the copy is gone')

  // A rollover moves one task forward and drops the rest: undo restores yesterday's entries and removes the copy.
  const day2 = P0.days[1]!
  const rolled = rolloverDay(P0, {}, pools, { fromDate: day1.date, toDate: day2.date, evidence: none })!
  const rsnap = undoSnapshotFor(P0, {}, rolled.diff!.date, rolled.diff!.summary, [day1.date, day2.date])
  const rback = applyUndo(rolled.plan, rolled.taskState, rsnap)
  assert.deepEqual(rback.plan.days, P0.days)
  assert.deepEqual(rback.taskState, {}, 'no deferred or dropped entries survive the undo')
  assert.equal(rback.plan.lastDiffDate, undefined)

  // A took_longer check-in changes the duration scale; undo puts that back too.
  const q = P0.days.flatMap((d) => work(d)).find((t) => t.taskType === 'question')!
  const longer = applyTaskAction(P0, {}, pools, req(q.id, 'checkin', { feel: 'took_longer', actualMinutes: 35 }), ctx)
  const lsnap = undoSnapshotFor(P0, {}, longer.diff!.date, longer.diff!.summary, longer.changedDates)
  const lback = applyUndo(longer.plan, longer.taskState, lsnap)
  assert.equal(lback.plan.durationScale, undefined)
  assert.deepEqual(lback.plan.days, P0.days)
}

// --- carry over: the student's own move, to a day they choose ---------------------------------------

{
  const day2 = P0.days[1]!
  const day3 = P0.days[2]!
  // The options list the next study days nearest first, each with what the move would do.
  const opts = carryOptions(P0, {}, t2, START, ctx.nowMinute)
  assert.ok(opts.length >= 3 && opts.length <= 7, `a handful of days (${opts.length})`)
  assert.ok(!opts.some((o) => o.date === day1.date), 'never its own day')
  assert.ok(opts.every((o, i) => i === 0 || o.date > opts[i - 1]!.date), 'nearest first')
  assert.ok(opts.every((o) => o.date < EXAM), 'never on or after the paper')
  assert.ok(opts.every((o) => ['full', 'shortened', 'over'].includes(o.fit)))
  const targets = carryTargets(P0, t2, day1.date, START)
  assert.ok(targets.includes(day2.date) && targets.includes(day3.date))
  assert.ok(!targets.includes(day1.date))

  // Carry t2 to day 3: the original says where it went, the copy sits on day 3 at full length and remembers its origin.
  const r = applyTaskAction(P0, {}, pools, req(t2.id, 'carry', { toDate: day3.date }), ctx)
  assert.ok(!r.noop, r.reason)
  assert.equal(r.structural, true)
  assert.deepEqual(r.changedDates, [day1.date, day3.date])
  assert.equal(r.taskState[t2.id]!.status, 'deferred')
  assert.equal(r.taskState[t2.id]!.deferredTo, day3.date)
  assert.equal(r.taskState[t2.id]!.auto, undefined, 'the student did this, not the rollover')
  const target = r.plan.days.find((d) => d.date === day3.date)!
  const copy = target.blocks.find((b) => b.carriedFrom === t2.id)!
  assert.ok(copy, 'the copy is on the chosen day')
  assert.equal(copy.minutes, t2.minutes, 'at its full length where the day has room')
  assert.equal(copy.topic?.code, t2.topic?.code)
  assert.equal(copy.href, undefined, 'the copy forgets the original link and is hydrated afresh')
  assert.deepEqual(r.needsHydration, [copy.id])
  assert.equal(r.taskState[copy.id], undefined, 'a full-length copy carries no state: it may be carried again')
  assert.equal(r.diff!.date, day3.date)
  assert.equal(r.diff!.changes[0]!.kind, 'added')
  assert.match(r.diff!.changes[0]!.detail!, /Carried over from/)
  assert.ok(calm(r.diff!.summary) && calm(r.diff!.changes[0]!.detail!))
  assert.equal(r.event!.type, 'task_carried')
  assert.deepEqual(r.event!.meta, { from: day1.date, to: day3.date, fit: 'full', was: 'todo' })
  assert.deepEqual(clockErrors(r.plan), [], 'a full-length carry keeps the clock invariants')
  assert.equal(target.workMinutes, day3.workMinutes + t2.minutes, 'the day grew by the copy')
  assert.equal(day1.blocks.length, r.plan.days[0]!.blocks.length, 'the day it came from keeps its blocks; only its state changed')

  // The copy can be carried on again; the original cannot (it has moved).
  const again = applyTaskAction(r.plan, r.taskState, pools, req(copy.id, 'carry', { toDate: day2.date }), ctx)
  assert.ok(!again.noop, 'the copy is carryable')
  assert.ok(applyTaskAction(r.plan, r.taskState, pools, req(t2.id, 'carry', { toDate: day2.date }), ctx).noop, 'the original has moved already')

  // Refusals: a done task, its own day, a day before today, a day on or after the paper, no day at all.
  const done: TaskState = { [t2.id]: { status: 'done', at: 'x' } }
  assert.ok(applyTaskAction(P0, done, pools, req(t2.id, 'carry', { toDate: day2.date }), ctx).noop)
  assert.ok(applyTaskAction(P0, {}, pools, req(t2.id, 'carry', { toDate: day1.date }), ctx).noop)
  assert.ok(applyTaskAction(P0, {}, pools, req(t2.id, 'carry'), ctx).noop)
  assert.ok(applyTaskAction(P0, {}, pools, req(t2.id, 'carry', { toDate: EXAM }), ctx).noop)
  const laterCtx: ActionContext = { ...ctx, todayIso: day3.date }
  assert.ok(applyTaskAction(P0, {}, pools, req(t2.id, 'carry', { toDate: day2.date }), laterCtx).noop, 'a day before today is not a day')
  // A skipped task today is still carryable: skipping was a choice about today, not about the topic.
  const skipped: TaskState = { [t2.id]: { status: 'skipped', at: 'x' } }
  assert.ok(!applyTaskAction(P0, skipped, pools, req(t2.id, 'carry', { toDate: day2.date }), ctx).noop)

  // Undo puts both days back.
  const snap = undoSnapshotFor(P0, {}, r.diff!.date, r.diff!.summary, r.changedDates)
  const back = applyUndo(r.plan, r.taskState, snap)
  assert.deepEqual(back.plan.days.find((d) => d.date === day3.date)!.blocks.map((b) => b.id), day3.blocks.map((b) => b.id))
  assert.equal(back.taskState[t2.id], undefined, 'the original is open again')
  assert.equal(back.taskState[copy.id], undefined)
}
{
  // A day with no free time takes the copy after its last block, past the window, and the option says so.
  const full = P0.days[1]!
  const packed: RoadmapDay = {
    ...full,
    windows: [{ start: '16:00', end: '17:00' }],
    capacityMinutes: 60,
    bufferMinutes: 0,
    workMinutes: 60,
    blocks: [{ ...t3, id: taskIdFor(full.date, t3.subjectCode, t3.topic?.code ?? t3.taskType, 9), minutes: 60, startsAt: '16:00', endsAt: '17:00' }],
  }
  const plan: RoadmapPlan = { ...P0, days: P0.days.map((d) => (d.date === full.date ? packed : d)) }
  const opt = carryOptions(plan, {}, t2, START, ctx.nowMinute).find((o) => o.date === full.date)!
  assert.ok(opt, 'still offered')
  assert.equal(opt.fit, 'over')
  assert.equal(opt.minutes, t2.minutes)
  assert.equal(opt.over, t2.minutes, 'it runs the whole task past 17:00')
  const r = applyTaskAction(plan, {}, pools, req(t2.id, 'carry', { toDate: full.date }), ctx)
  assert.ok(!r.noop)
  const target = r.plan.days.find((d) => d.date === full.date)!
  const copy = target.blocks.find((b) => b.carriedFrom === t2.id)!
  assert.equal(copy.startsAt, '17:00')
  assert.match(r.diff!.changes[0]!.detail!, /past the day's last window/)
  assert.equal(r.event!.meta!.fit, 'over')
  // A day with a little free time shortens the copy to it, and the state says so.
  const tight: RoadmapDay = { ...packed, windows: [{ start: '16:00', end: '17:15' }], capacityMinutes: 75 }
  const plan2: RoadmapPlan = { ...P0, days: P0.days.map((d) => (d.date === full.date ? tight : d)) }
  const opt2 = carryOptions(plan2, {}, t2, START, ctx.nowMinute).find((o) => o.date === full.date)!
  assert.equal(opt2.fit, t2.minutes > 15 ? 'shortened' : 'full')
  if (opt2.fit === 'shortened') {
    assert.equal(opt2.minutes, 15)
    const r2 = applyTaskAction(plan2, {}, pools, req(t2.id, 'carry', { toDate: full.date }), ctx)
    const copy2 = r2.plan.days.find((d) => d.date === full.date)!.blocks.find((b) => b.carriedFrom === t2.id)!
    assert.equal(r2.taskState[copy2.id]!.status, 'shortened')
    assert.equal(r2.taskState[copy2.id]!.minutes, 15)
    assert.match(r2.diff!.changes[0]!.detail!, /shortened to 15 min/)
  }
}
{
  // What the rollover let go can be carried forward the next day; its entries say the plan settled them, not the student.
  const day2 = P0.days[1]!
  const rolled = rolloverDay(P0, {}, pools, { fromDate: day1.date, toDate: day2.date, evidence: none })!
  const dropped = work(day1).filter((t) => rolled.taskState[t.id]?.status === 'dropped')
  assert.ok(dropped.length >= 1, 'the rollover let some of day one go')
  for (const t of dropped) assert.equal(rolled.taskState[t.id]!.auto, true, `${t.id} was settled by the plan`)
  const moved = work(day1).find((t) => rolled.taskState[t.id]?.status === 'deferred')
  if (moved) assert.equal(rolled.taskState[moved.id]!.auto, true)
  const tomorrow: ActionContext = { ...ctx, todayIso: day2.date, nowMinute: 9 * 60 }
  const pick = dropped[0]!
  const opts = carryOptions(rolled.plan, rolled.taskState, pick, day2.date, tomorrow.nowMinute)
  assert.ok(opts.length > 0 && opts[0]!.date === day2.date, 'today is the first option')
  const r = applyTaskAction(rolled.plan, rolled.taskState, pools, req(pick.id, 'carry', { toDate: day2.date }), tomorrow)
  assert.ok(!r.noop, r.reason)
  assert.equal(r.taskState[pick.id]!.status, 'deferred')
  assert.equal(r.taskState[pick.id]!.auto, undefined, 'carrying it forward is the student\'s own move')
  assert.equal(r.event!.meta!.was, 'dropped')
  const copy = r.plan.days.find((d) => d.date === day2.date)!.blocks.find((b) => b.carriedFrom === pick.id)!
  assert.ok(copy && minuteOfDay(copy.startsAt) >= tomorrow.nowMinute, 'today\'s copy lands after now')
}
{
  // A task on a day kept from an earlier build can be carried into this plan; nothing else can touch it.
  const day2 = P0.days[1]!
  const old = { ...day1, date: '2026-09-10', day: 3, archived: true as const, blocks: day1.blocks.map((b) => ({ ...b, id: b.id.replace(day1.date, '2026-09-10') })) }
  const plan: RoadmapPlan = { ...P0, archive: [old] }
  const oldTask = old.blocks.find((b) => WORK_KINDS.has(b.kind))!
  const state: TaskState = { [oldTask.id]: { status: 'dropped', at: '2026-09-11T00:00:00.000Z', auto: true } }
  assert.ok(applyTaskAction(plan, state, pools, req(oldTask.id, 'complete'), ctx).noop, 'an archived task cannot be ticked')
  const archivedOpts = carryOptions(plan, state, oldTask, START, ctx.nowMinute)
  assert.ok(archivedOpts.length > 0 && archivedOpts[0]!.date >= START, 'the sheet offers days for an archived task too')
  // A subject that left the plan at the rebuild has no days to offer.
  const gone: RoadmapPlan = { ...plan, subjects: plan.subjects.filter((s) => s.code !== oldTask.subjectCode) }
  assert.deepEqual(carryOptions(gone, state, oldTask, START, ctx.nowMinute), [])
  assert.ok(applyTaskAction(gone, state, pools, req(oldTask.id, 'carry', { toDate: day2.date }), ctx).noop)
  const r = applyTaskAction(plan, state, pools, req(oldTask.id, 'carry', { toDate: day2.date }), ctx)
  assert.ok(!r.noop, r.reason)
  assert.deepEqual(r.changedDates, ['2026-09-10', day2.date])
  assert.equal(r.taskState[oldTask.id]!.status, 'deferred')
  assert.deepEqual(r.plan.archive, plan.archive, 'the archived day itself is never rewritten')
  const copy = r.plan.days.find((d) => d.date === day2.date)!.blocks.find((b) => b.carriedFrom === oldTask.id)
  assert.ok(copy, 'the copy is on a day this plan lays')
  const snap = undoSnapshotFor(plan, state, r.diff!.date, r.diff!.summary, r.changedDates)
  const back = applyUndo(r.plan, r.taskState, snap)
  assert.equal(back.taskState[oldTask.id]!.status, 'dropped', 'undo restores the archived entry')
}

// --- rollover: re-branch, defer one, drop the rest, idempotent ------------------------------------

{
  const day2 = P0.days[1]!
  const r = rolloverDay(P0, {}, pools, { fromDate: day1.date, toDate: day2.date, evidence: none })!
  assert.ok(r && !r.noop)
  assert.equal(r.diff!.summary, ROLLOVER_SUMMARY)
  assert.ok(calm(ROLLOVER_SUMMARY))
  assert.equal(r.diff!.date, day2.date)
  const open = work(day1)
  const top = [...open].sort((x, y) => y.priority - x.priority)[0]!
  const moved = r.diff!.changes.find((c) => c.kind === 'moved' || c.kind === 'dropped')!
  assert.equal(moved.taskId, top.id, 'the highest-priority undone task is the one that moves')
  assert.equal(r.taskState[top.id]!.status, moved.kind === 'moved' ? 'deferred' : 'dropped')
  for (const t of open) if (t.id !== top.id) assert.equal(r.taskState[t.id]!.status, 'dropped', `${t.id} returns to the pool`)
  assert.equal(r.diff!.changes.filter((c) => c.kind === 'dropped' && c.taskId !== top.id).length, 0, 'no diff noise for the rest')
  if (moved.kind === 'moved') {
    const target = r.plan.days.find((d) => d.date === day2.date)!
    const copy = target.blocks.find((b) => b.topic?.code === top.topic?.code && b.subjectCode === top.subjectCode && b.taskType === top.taskType && b.id !== top.id)!
    assert.ok(copy, 'the copy is on the next day')
    assert.equal(r.taskState[copy.id]!.deferredTo, day2.date)
    assert.equal(r.plan.lastDiffDate, day2.date)
    assert.deepEqual(r.plan.lastDiff, r.diff, 'the rollover diff rides on the plan so the page can show it and offer undo')
    assert.deepEqual(r.needsHydration, [copy.id], 'the copy is hydrated afresh')
  }
  assert.equal(r.pools, pools, 'no diagnostic marked, the pools are untouched')
  assert.equal(rolloverDay(r.plan, r.taskState, pools, { fromDate: day1.date, toDate: day2.date, evidence: none }), null, 'nothing undone remains: idempotent')
  // A day that went fully to plan rolls nothing.
  const allDone: TaskState = {}
  for (const t of open) allDone[t.id] = { status: 'done', at: 'x' }
  assert.equal(rolloverDay(P0, allDone, pools, { fromDate: day1.date, toDate: day2.date, evidence: none }), null)
  assert.equal(rolloverDay(P0, {}, pools, { fromDate: '2030-01-01', toDate: '2030-01-02', evidence: none }), null)

  // Re-branch: a sound diagnostic drops the repair; a weak one keeps it; both settle the provisional flags.
  const topicTasks = (p: RoadmapPlan, code: string) => p.days.flatMap((d) => work(d).map((t) => ({ ...t, date: d.date }))).filter((t) => t.subjectCode === '9709' && t.topic?.code === code)
  const withRepair = codesOf(8, '1').find((code) => topicTasks(P0, code).some((t) => t.provisional && t.loopStep === 'repair' && t.date >= day2.date))!
  assert.ok(withRepair, 'a topic with a provisional repair ahead')
  const sound = rolloverDay(P0, allDone, pools, { fromDate: day1.date, toDate: day2.date, evidence: none, topicResults: { [`t:9709|${withRepair}`]: 80 } })!
  assert.ok(sound, 'a re-branch alone is a change')
  for (const t of topicTasks(sound.plan, withRepair)) {
    if (t.date < day2.date) continue
    assert.ok(!t.provisional, `${t.id} is settled`)
    if (t.loopStep === 'repair') {
      assert.equal(sound.taskState[t.id]!.status, 'dropped', 'the repair goes')
      assert.ok(sound.diff!.changes.some((c) => c.taskId === t.id && c.kind === 'dropped'))
    } else {
      assert.notEqual(sound.taskState[t.id]?.status, 'dropped', 'recall and proof stay')
    }
  }
  const weak = rolloverDay(P0, allDone, pools, { fromDate: day1.date, toDate: day2.date, evidence: none, topicResults: { [`t:9709|${withRepair}`]: 50 } })!
  for (const t of topicTasks(weak.plan, withRepair)) {
    if (t.date < day2.date) continue
    assert.ok(!t.provisional)
    assert.notEqual(weak.taskState[t.id]?.status, 'dropped', 'a weak result keeps the repair')
  }
  assert.equal(rolloverDay(weak.plan, weak.taskState, pools, { fromDate: day1.date, toDate: day2.date, evidence: none, topicResults: { [`t:9709|${withRepair}`]: 50 } }), null, 'settled once, settled for good')
  // The pool learns the marked result either way.
  assert.deepEqual([weak.pools['9709']!.find((p) => p.code === withRepair)!.loop, weak.pools['9709']!.find((p) => p.code === withRepair)!.uncertainty], ['weak', 0])
  assert.equal(sound.pools['9709']!.find((p) => p.code === withRepair)!.loop, 'strong')

  // A confident self-rating gave a topic a strong provisional loop (no repair). A weak diagnostic puts a concept refresh
  // in front of its marked question on the next study day, and the diff says why.
  const physTasks = (p: RoadmapPlan, code: string) => p.days.flatMap((d) => work(d).map((t) => ({ ...t, date: d.date }))).filter((t) => t.subjectCode === '9702' && t.topic?.code === code)
  const confident = codesOf(6, '9').find((code) => {
    const list = physTasks(P0, code)
    return list.some((t) => t.provisional && t.loopStep === 'prove' && t.date >= day2.date) && !list.some((t) => t.loopStep === 'repair')
  })!
  assert.ok(confident, 'a confident topic with a provisional proof ahead and no repair')
  const rebranched = rolloverDay(P0, allDone, pools, { fromDate: day1.date, toDate: day2.date, evidence: none, topicResults: { [`t:9702|${confident}`]: 20 } })!
  const inserted = rebranched.diff!.changes.find((c) => c.kind === 'inserted')!
  assert.ok(inserted, 'a concept refresh was inserted')
  assert.match(inserted.detail ?? '', /found this topic weak/)
  const concept = physTasks(rebranched.plan, confident).find((t) => t.id === inserted.taskId)!
  assert.deepEqual([concept.taskType, concept.loopStep, concept.date], ['concept', 'repair', day2.date])
  const proveAfter = physTasks(rebranched.plan, confident).find((t) => t.loopStep === 'prove' && t.date >= day2.date)!
  assert.ok(proveAfter.date > concept.date || (proveAfter.date === concept.date && minuteOfDay(proveAfter.startsAt) > minuteOfDay(concept.startsAt)), 'the refresh comes before the question')
  assert.ok(rebranched.needsHydration.includes(inserted.taskId))
  assert.equal(rebranched.pools['9702']!.find((p) => p.code === confident)!.loop, 'weak')
  assert.deepEqual(clockErrors(rebranched.plan), [])
}

// --- the today summary ---------------------------------------------------------------------------

{
  const s = todaySummaryFor(P0, {}, none, {}, START, 16 * 60)
  assert.equal(s.hasPlan, true)
  assert.deepEqual([s.date, s.dayNumber, s.daysLeft, s.revision, s.status, s.feasibility], [START, 1, 19, 1, 'on_track', P0.feasibility!.state])
  assert.deepEqual(s.nearestExam, { label: 'Mathematics', date: EXAM, daysLeft: 19 })
  assert.equal(s.nextTask?.id, t1.id)
  assert.deepEqual([s.nextTask?.category, s.nextTask?.minutes, s.nextTask?.startsAt], [t1.category, t1.minutes, t1.startsAt])
  assert.ok(s.remainingMinutes! > 0)
  // The chip's line: "Roadmap · Quick diagnostic · Maths 1.1 · 10 min" needs the type and the topic, not the objective.
  assert.deepEqual([s.nextTask?.taskType, s.nextTask?.topic], [t1.taskType, t1.topic?.name])
  assert.ok(s.nextTask?.topic, 'the first task has a topic')
  // The clock inputs are stored beside the clock-dependent answer, so the today route can re-time the row.
  assert.equal(s.openMinutes, work(day1).reduce((n, t) => n + t.minutes, 0), 'open minutes are the whole day before anything is done')
  assert.equal(s.windowEndMinute, 21 * 60, 'the weekday window ends at 21:00')
  assert.equal(s.remainingMinutes, Math.min(s.openMinutes!, 21 * 60 - 16 * 60))
  const afterOne = todaySummaryFor(P0, { [t1.id]: { status: 'done', at: '2026-09-16T11:20:00.000Z' } }, none, {}, START, 16 * 60)
  assert.equal(afterOne.openMinutes, s.openMinutes! - t1.minutes, 'a done task leaves the open minutes')
  assert.equal(afterOne.nextTask?.id, t2.id)
  assert.equal(todaySummaryFor(P0, {}, none, {}, START, 16 * 60, (id) => `/go/${id}`).nextTask?.href, `/go/${t1.id}`)
  const out = todaySummaryFor(P0, {}, none, {}, '2026-10-05', 9 * 60)
  assert.deepEqual([out.hasPlan, out.nextTask, out.daysLeft], [true, undefined, 0], 'exam day is not a plan day')

  // A v2 plan reads through the same summary.
  const v2: HydratedPlan = {
    ...buildStudyPlan({ startDate: START, examDate: EXAM, preparedness: 'secure', minutesPerDay: 90, availability: [90, 90, 90, 90, 90, 90, 90], subjects: [{ code: '9709', label: 'Mathematics', highYield: [{ code: '1.6', name: 'Series', source: 'high_yield', weight: 15 }], weak: [], hasTimedPaper: true }] }),
    generatedAt: '2026-09-16T07:00:00.000Z',
  }
  const v = todaySummaryFor(v2, {}, none, {}, START, 20 * 60)
  assert.equal(v.hasPlan, true)
  assert.match(v.nextTask!.id, /^2026-09-16-9709-1\.6-1$/)
  assert.equal(v.nextTask!.category, 'practise')
  assert.equal(v.nextTask!.startsAt, undefined)
  assert.equal(v.status, 'on_track')
  assert.equal(v.windowEndMinute, null, 'a v2 plan has no windows, so the clock never caps it')
  assert.equal(v.nextTask!.taskType, 'question')
  assert.equal(todaySummaryFor({ ...v2, days: [] }, {}, none, {}, START, 0).hasPlan, false)
}

// --- the today route's fast path: when the stored row can answer, and the re-timing --------------

{
  const stored = todaySummaryFor(P0, {}, none, {}, START, 16 * 60)
  assert.equal(storedSummaryServes(stored, START, START, 1), true, "today's summary, rolled to today, at the row's revision")
  assert.equal(storedSummaryServes(stored, START, '2026-09-17'), true, 'rolled past today still serves')
  assert.equal(storedSummaryServes(stored, START, '2026-09-15'), false, 'a rollover is pending')
  assert.equal(storedSummaryServes(stored, START, null), false, 'never rolled')
  assert.equal(storedSummaryServes(stored, '2026-09-17', '2026-09-17'), false, "yesterday's summary")
  assert.equal(storedSummaryServes(stored, START, START, 2), false, 'the plan moved on since the summary was written')
  assert.equal(storedSummaryServes(null, START, START), false)
  assert.equal(storedSummaryServes({ hasPlan: false }, START, START), false)
  const { openMinutes: _o, windowEndMinute: _w, ...legacy } = stored
  assert.equal(storedSummaryServes(legacy, START, START), false, 'a summary written before the clock inputs existed takes the full path')

  // remainingMinutes = min(openMinutes, windowEnd − now); the next task shortens to what is left and goes when under the floor.
  const open = stored.openMinutes!
  assert.equal(remainingMinutesAt(stored, 16 * 60).remainingMinutes, Math.min(open, 300))
  assert.equal(remainingMinutesAt(stored, 20 * 60 + 30).remainingMinutes, Math.min(open, 30))
  assert.equal(remainingMinutesAt(stored, 21 * 60).remainingMinutes, 0, 'the window has closed')
  assert.equal(remainingMinutesAt(stored, 22 * 60).remainingMinutes, 0, 'never negative after the window')
  const late = remainingMinutesAt(stored, 21 * 60 - MIN_DAY_MINUTES + 1)
  assert.equal(late.nextTask, undefined, 'under a real task of time left: nothing more today, as the hero says')
  const squeezed = remainingMinutesAt(stored, 21 * 60 - MIN_DAY_MINUTES)
  assert.deepEqual([squeezed.nextTask?.id, squeezed.nextTask?.minutes], [t1.id, Math.min(t1.minutes, MIN_DAY_MINUTES)])
  const roomy = remainingMinutesAt(stored, 16 * 60)
  assert.deepEqual([roomy.nextTask?.id, roomy.nextTask?.minutes], [t1.id, t1.minutes], 'plenty of time leaves the task whole')
  assert.notEqual(roomy, stored, 'a copy, never the stored object')
  const uncapped: RoadmapTodaySummary = { ...stored, windowEndMinute: null }
  assert.equal(remainingMinutesAt(uncapped, 23 * 60 + 59).remainingMinutes, open, 'no windows: the open minutes stand at any hour')
  assert.equal(remainingMinutesAt(uncapped, 23 * 60 + 59).nextTask?.minutes, t1.minutes)
  assert.equal(remainingMinutesAt({ hasPlan: true, date: START, remainingMinutes: 25 }, 12 * 60).remainingMinutes, 25, 'a legacy row falls back to what it stored')
}

console.log('task-actions.test.ts: ok')
