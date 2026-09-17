/**
 * Reading a roadmap.
 *
 * The client-safe helpers the roadmap screen, the dashboard hero, the Study
 * Mode chip, the check-in and the API's today summary share: which task is
 * next, how many minutes are really left, what the status chip says. Pure,
 * and it imports no server module and no catalogue, so it ships in the
 * client bundle and runs under `pnpm test:plan`.
 *
 * Every consumer reads a plan through normaliseRoadmap(): a v2 plan (no
 * task ids, no categories, no windows) comes out with the same shape as a
 * v3 one, so nothing downstream checks the version.
 */

import { planLength, type PlanBlockKind } from '@/lib/plan/build-study-plan'
import { modeFromStored } from '@/lib/plan/modes'
import {
  blockEvidenceKey,
  isWorkBlock,
  type HydratedBlock,
  type HydratedDay,
  type HydratedPlan,
} from '@/lib/plan/plan-view'
import {
  MIN_DAY_MINUTES,
  TASK_CATEGORY,
  type ClockTime,
  type EvidenceItem,
  type RoadmapDayExtras,
  type RoadmapPlanExtras,
  type RoadmapStatus,
  type RoadmapTaskFields,
  type TaskState,
  type TaskStateEntry,
  type TaskType,
} from '@/lib/plan/roadmap-types'

export type RoadmapTask = HydratedBlock & RoadmapTaskFields

export type RoadmapDay = Omit<HydratedDay, 'blocks'> & RoadmapDayExtras & { blocks: RoadmapTask[] }

export type RoadmapPlan = Omit<HydratedPlan, 'days'> & RoadmapPlanExtras & { days: RoadmapDay[] }

// --- clock -----------------------------------------------------------------------------

/** 'HH:MM' → minutes since local midnight. Malformed input reads as 0. */
export function minuteOfDay(clock: ClockTime | null | undefined): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '')
  if (!m) return 0
  return Math.min(1439, Number(m[1]) * 60 + Number(m[2]))
}

/** Minutes since midnight → 'HH:MM'. Clamped to a day. */
export function clockOf(minute: number): ClockTime {
  const m = Math.max(0, Math.min(1439, Math.round(minute)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** "4:30 pm" for a chip; the timeline keeps 24-hour. */
export function formatClock(clock: ClockTime): string {
  const m = minuteOfDay(clock)
  const h = Math.floor(m / 60)
  const min = m % 60
  const suffix = h < 12 ? 'am' : 'pm'
  const hour = h % 12 === 0 ? 12 : h % 12
  return min === 0 ? `${hour} ${suffix}` : `${hour}:${String(min).padStart(2, '0')} ${suffix}`
}

// --- identity --------------------------------------------------------------------------

/**
 * A task id that survives replans and rebuilds: date, subject, topic (or
 * type) and the per-day ordinal of that tuple. Never positional, so a
 * replan that drops the block before a pinned one leaves the pinned id alone.
 */
export function taskIdFor(date: string, subjectCode: string | undefined, key: string, n: number): string {
  return `${date}-${subjectCode ?? 'x'}-${key}-${n}`
}

const KIND_TO_TYPE: Record<PlanBlockKind, TaskType> = {
  drill: 'question',
  timed_paper: 'timed_paper',
  review: 'review',
  learn: 'concept',
  buffer: 'buffer',
  break: 'break',
  rest: 'rest',
}

// --- normalisation ---------------------------------------------------------------------

/** Every block as a task: v3 blocks as stored, v2 blocks filled in. */
export function normaliseTask(block: HydratedBlock, date: string, seen: Map<string, number>): RoadmapTask {
  const taskType: TaskType = block.taskType ?? KIND_TO_TYPE[block.kind]
  const key = block.topic?.code ?? taskType
  let id = block.id
  if (!id) {
    const tupleKey = `${block.subjectCode ?? 'x'}|${key}`
    const n = (seen.get(tupleKey) ?? 0) + 1
    seen.set(tupleKey, n)
    id = taskIdFor(date, block.subjectCode, key, n)
  }
  return {
    ...block,
    id,
    taskType,
    category: block.category ?? TASK_CATEGORY[taskType],
    objective: block.objective ?? block.label,
    why: block.why ?? [],
    priority: block.priority ?? 0,
  }
}

export function normaliseDay(day: HydratedDay): RoadmapDay {
  const seen = new Map<string, number>()
  const blocks = day.blocks.map((b) => normaliseTask(b, day.date, seen))
  const breaks = day.blocks.reduce((n, b) => n + (b.kind === 'break' ? b.minutes : 0), 0)
  return {
    ...day,
    blocks,
    capacityMinutes: day.capacityMinutes ?? day.workMinutes + breaks,
    bufferMinutes: day.bufferMinutes ?? 0,
    commitments: day.commitments ?? [],
    windows: day.windows ?? [],
  }
}

export function normaliseRoadmap(plan: HydratedPlan): RoadmapPlan {
  return {
    ...plan,
    days: plan.days.map(normaliseDay),
    mode: modeFromStored(plan.mode ?? plan.preparedness),
    algorithmVersion: plan.algorithmVersion ?? plan.version ?? 1,
    revision: plan.revision ?? 1,
    feasibility: plan.feasibility ?? null,
    exams:
      plan.exams ??
      plan.subjects.map((s) => ({
        subjectCode: s.code,
        label: s.label,
        board: '',
        qualification: '',
        examDate: s.examDate,
      })),
    availabilityDetail: plan.availabilityDetail ?? null,
    selfRatings: plan.selfRatings ?? {},
  }
}

// --- task state ------------------------------------------------------------------------

export type TaskStanding = 'done' | 'skipped' | 'deferred' | 'dropped' | 'started' | 'todo'

/** What the task is, from its state and the student's marked work. Marking the question is done, tick or no tick. */
export function taskStanding(
  task: RoadmapTask,
  state: TaskState,
  evidence: ReadonlySet<string>
): TaskStanding {
  const entry = state[task.id]
  if (entry?.status === 'done') return 'done'
  if (entry?.status === 'skipped') return 'skipped'
  if (entry?.status === 'deferred') return 'deferred'
  if (entry?.status === 'dropped') return 'dropped'
  const key = blockEvidenceKey(task)
  if (key && evidence.has(key)) return 'done'
  if (entry?.status === 'started') return 'started'
  return 'todo'
}

/** Settled = nothing left to do on it today, for any reason. */
export function isSettled(standing: TaskStanding): boolean {
  return standing === 'done' || standing === 'skipped' || standing === 'deferred' || standing === 'dropped'
}

/** The minutes a task is now, after any shorten. */
export function taskMinutes(task: RoadmapTask, state: TaskState): number {
  const entry: TaskStateEntry | undefined = state[task.id]
  return entry?.minutes ?? task.minutes
}

export function workTasks(day: Pick<RoadmapDay, 'blocks'>): RoadmapTask[] {
  return day.blocks.filter(isWorkBlock)
}

/** Work tasks still to do, in order; a started task first. */
export function openTasks(day: Pick<RoadmapDay, 'blocks'>, state: TaskState, evidence: ReadonlySet<string>): RoadmapTask[] {
  const open = workTasks(day).filter((t) => !isSettled(taskStanding(t, state, evidence)))
  const started = open.filter((t) => taskStanding(t, state, evidence) === 'started')
  return [...started, ...open.filter((t) => !started.includes(t))]
}

export function nextTask(day: Pick<RoadmapDay, 'blocks'>, state: TaskState, evidence: ReadonlySet<string>): RoadmapTask | null {
  return openTasks(day, state, evidence)[0] ?? null
}

/** Every work task done or skipped, and at least one done — the day ticks itself. */
export function dayCompleteFromTasks(day: Pick<RoadmapDay, 'blocks'>, state: TaskState, evidence: ReadonlySet<string>): boolean {
  const work = workTasks(day)
  if (work.length === 0) return false
  let done = 0
  for (const t of work) {
    const s = taskStanding(t, state, evidence)
    if (s === 'done') done += 1
    else if (s !== 'skipped') return false
  }
  return done > 0
}

/** Minutes from now to the end of the day's last window; Infinity when the day has no window data. */
export function minutesLeftInWindows(day: Pick<RoadmapDay, 'windows'>, nowMinute: number): number {
  if (day.windows.length === 0) return Number.POSITIVE_INFINITY
  const end = Math.max(...day.windows.map((w) => minuteOfDay(w.end)))
  return Math.max(0, end - nowMinute)
}

/**
 * What today can still hold: the open tasks' minutes, capped by the clock
 * when the plan knows the student's windows. The hero never says "best use
 * of 72 minutes" at 20:40 with a window that ends at 21:00.
 */
export function remainingToday(
  day: Pick<RoadmapDay, 'blocks' | 'windows'>,
  state: TaskState,
  evidence: ReadonlySet<string>,
  nowMinute: number
): number {
  const open = openTasks(day, state, evidence).reduce((n, t) => n + taskMinutes(t, state), 0)
  return Math.min(open, minutesLeftInWindows(day, nowMinute))
}

export type Hero =
  /** minutes: what the first task gets; dayMinutes: what today can still hold — the eyebrow's N. */
  | { kind: 'task'; task: RoadmapTask; minutes: number; shortened: boolean; dayMinutes?: number }
  | { kind: 'done' }
  | { kind: 'no_time'; nextDate: string | null }
  | { kind: 'rest' }

/** The hero card's decision, in one place. */
export function heroFor(
  plan: Pick<RoadmapPlan, 'days'>,
  day: RoadmapDay,
  state: TaskState,
  evidence: ReadonlySet<string>,
  nowMinute: number
): Hero {
  if (workTasks(day).length === 0) return { kind: 'rest' }
  const task = nextTask(day, state, evidence)
  if (!task) return { kind: 'done' }
  const left = minutesLeftInWindows(day, nowMinute)
  const wanted = taskMinutes(task, state)
  if (left < MIN_DAY_MINUTES) {
    const next = plan.days.find((d) => d.date > day.date && workTasks(d).length > 0)
    return { kind: 'no_time', nextDate: next?.date ?? null }
  }
  const dayMinutes = remainingToday(day, state, evidence, nowMinute)
  if (left < wanted) return { kind: 'task', task, minutes: Math.floor(left), shortened: true, dayMinutes }
  return { kind: 'task', task, minutes: wanted, shortened: false, dayMinutes }
}

// --- status ----------------------------------------------------------------------------

/** Study days before today, most recent first. */
function pastStudyDays(plan: Pick<RoadmapPlan, 'days'>, todayIso: string): RoadmapDay[] {
  return plan.days.filter((d) => d.date < todayIso && d.workMinutes > 0).reverse()
}

function dayHadWork(day: RoadmapDay, state: TaskState, evidence: ReadonlySet<string>, done: Record<string, boolean>): boolean {
  if (done[String(day.day)] === true) return true
  return workTasks(day).some((t) => taskStanding(t, state, evidence) === 'done')
}

/**
 * The chip. 'adjusted' when something changed today (replan, rollover, a
 * check-in effect); 'reset' when the last three study days all went by
 * with nothing done — the one moment a full rebuild is offered, because
 * the student is asking for it; otherwise 'on_track'. Never a count.
 */
export function roadmapStatus(
  plan: Pick<RoadmapPlan, 'days' | 'lastDiffDate'>,
  state: TaskState,
  evidence: ReadonlySet<string>,
  done: Record<string, boolean>,
  todayIso: string
): RoadmapStatus {
  if (plan.lastDiffDate === todayIso) return 'adjusted'
  const recent = pastStudyDays(plan, todayIso).slice(0, 3)
  if (recent.length === 3 && recent.every((d) => !dayHadWork(d, state, evidence, done))) return 'reset'
  return 'on_track'
}

/** "You've studied on 4 of the last 6 days." A fact and nothing else. */
export function studiedDaysLine(
  plan: Pick<RoadmapPlan, 'days'>,
  state: TaskState,
  evidence: ReadonlySet<string>,
  done: Record<string, boolean>,
  todayIso: string
): string {
  const recent = pastStudyDays(plan, todayIso).slice(0, 7)
  if (recent.length === 0) return 'Day one. Everything starts today.'
  const n = recent.filter((d) => dayHadWork(d, state, evidence, done)).length
  return `You've studied on ${n} of the last ${recent.length} ${recent.length === 1 ? 'day' : 'days'}.`
}

/** The nearest paper still ahead, for "19 days to Mathematics Paper 1". */
export function nearestExam(
  plan: Pick<RoadmapPlan, 'exams' | 'subjects'>,
  todayIso: string
): { label: string; date: string; daysLeft: number; component?: string } | null {
  const ahead = plan.exams.filter((e) => e.examDate >= todayIso).sort((a, b) => (a.examDate < b.examDate ? -1 : 1))
  const e = ahead[0]
  if (!e) return null
  return { label: e.label, date: e.examDate, daysLeft: planLength(todayIso, e.examDate), component: e.component }
}

/** The days after today: the next few in full, the rest as milestones. */
export function upcomingDays(plan: Pick<RoadmapPlan, 'days'>, todayIso: string, detailed = 4): { detailed: RoadmapDay[]; later: RoadmapDay[] } {
  const ahead = plan.days.filter((d) => d.date > todayIso)
  return { detailed: ahead.slice(0, detailed), later: ahead.slice(detailed) }
}

// --- evidence chips ----------------------------------------------------------------------

/** Short chip text for an evidence item; the sheet shows the full explanation. */
export function evidenceChip(item: EvidenceItem): string {
  switch (item.type) {
    case 'frequency':
      return item.stat ? `Set in ${item.stat.n} of ${item.stat.of} indexed papers` : 'Set often in indexed papers'
    case 'weak_area':
      return 'Your weak area'
    case 'recent_practice':
      return 'From your recent practice'
    case 'self_rated':
      return 'Checks where you stand'
    case 'prerequisite':
      return 'Comes first in the syllabus'
    case 'review_due':
      return 'Due for review'
    case 'nearest_paper':
      return 'On your nearest paper'
    case 'diagnostic':
      return 'From your diagnostic'
    case 'mode':
      return 'Fits your plan style'
    case 'core_syllabus':
      return 'Core syllabus'
    case 'on_syllabus':
    default:
      return 'On the syllabus'
  }
}

/** Carry task state across a rebuild: ids are tuple-based, so a task that still exists keeps its entry. */
export function carryOverTaskState(oldState: TaskState, newPlan: Pick<RoadmapPlan, 'days'>): TaskState {
  const ids = new Set<string>()
  for (const d of newPlan.days) for (const b of d.blocks) ids.add(b.id)
  const next: TaskState = {}
  for (const [id, entry] of Object.entries(oldState)) if (ids.has(id)) next[id] = entry
  return next
}

// --- lookups the reducers share ------------------------------------------------------------

/** The tasks on one date, in block order; [] when the date is not a plan day. */
export function tasksOnDate(plan: Pick<RoadmapPlan, 'days'>, date: string): RoadmapTask[] {
  return plan.days.find((d) => d.date === date)?.blocks ?? []
}

/** The task with this id and the day it sits on. */
export function findTask(plan: Pick<RoadmapPlan, 'days'>, taskId: string): { day: RoadmapDay; task: RoadmapTask; index: number } | null {
  for (const day of plan.days) {
    const index = day.blocks.findIndex((b) => b.id === taskId)
    if (index >= 0) return { day, task: day.blocks[index]!, index }
  }
  return null
}

/**
 * The ordinal a new tuple id takes on a day: one past the highest already
 * there, so a task inserted after a replan never reuses the id of one that
 * was dropped (its state entry would come back to life).
 */
export function nextTupleOrdinal(day: Pick<RoadmapDay, 'blocks'>, date: string, subjectCode: string | undefined, key: string): number {
  const prefix = `${taskIdFor(date, subjectCode, key, 0).slice(0, -1)}`
  let max = 0
  for (const b of day.blocks) {
    if (!b.id.startsWith(prefix)) continue
    const n = Number(b.id.slice(prefix.length))
    if (Number.isInteger(n) && n > max) max = n
  }
  return max + 1
}

/** The next day after `date` with work on it, before `beforeDate` when given. */
export function nextStudyDay(plan: Pick<RoadmapPlan, 'days'>, date: string, beforeDate?: string): RoadmapDay | null {
  return (
    plan.days.find((d) => d.date > date && (beforeDate === undefined || d.date < beforeDate) && (d.workMinutes > 0 || d.capacityMinutes > 0)) ??
    null
  )
}

/**
 * A subject's open loops from `fromDate`: topic code → the loop-step tasks
 * still to do, in plan order. A loop with nothing left is not open.
 */
export function openLoopsFor(
  plan: Pick<RoadmapPlan, 'days'>,
  state: TaskState,
  evidence: ReadonlySet<string>,
  subjectCode: string,
  fromDate: string
): Map<string, RoadmapTask[]> {
  const open = new Map<string, RoadmapTask[]>()
  for (const day of plan.days) {
    if (day.date < fromDate) continue
    for (const t of day.blocks) {
      if (t.subjectCode !== subjectCode || !t.topic || !t.loopStep) continue
      if (isSettled(taskStanding(t, state, evidence))) continue
      open.set(t.topic.code, [...(open.get(t.topic.code) ?? []), t])
    }
  }
  return open
}
