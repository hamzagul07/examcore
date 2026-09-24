/**
 * What happens to a roadmap when the student acts on it.
 *
 * Every action, replan and rollover is a pure reducer over (plan, task
 * state, pools): the routes load the row, call one function here, and write
 * back what comes out. Nothing in this module touches the clock or a table,
 * so each transition is pinned by a test and the same request applied twice
 * gives the same state (the route treats a repeat as a no-op).
 *
 * The rules that keep a replan trustworthy:
 *
 *   Protected tasks are never moved. Done, started and pinned tasks keep
 *   their id, minutes and clock byte-for-byte. Ids are tuple-based (date,
 *   subject, topic, ordinal), so a task that survives a replan keeps its
 *   state entry without any remapping.
 *
 *   Nothing stacks. An undone task is deferred at most once, into the next
 *   study day's time in hand, and only if it fits there after shortening to
 *   its floor. Otherwise it is let go with a calm line and the pool keeps
 *   it for a later rebuild. A deferred copy carries `deferredTo`, so the
 *   rollover never defers it again.
 *
 *   Every check-in feeling does something defined (CHECKIN_FEEL_EFFECT),
 *   and everything a check-in, replan or rollover changes is written as a
 *   diff the student can read and undo.
 *
 * Pure and client-safe: it imports only sibling engine modules.
 */

import { layoutDay, mergeIntervals, subtractIntervals, type Interval } from '@/lib/plan/availability'
import { TASK_KIND, objectiveFor, planLength, stepMinutesFor } from '@/lib/plan/build-study-plan'
import { MIN_TASK_MINUTES, WEAK_BELOW_PCT } from '@/lib/plan/modes'
import { WORK_KINDS, formatPlanDate, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import { eligibleTopics } from '@/lib/plan/priority'
import {
  clockOf,
  findTask,
  heroFor,
  isSettled,
  minuteOfDay,
  nearestExam,
  nextStudyDay,
  nextTupleOrdinal,
  normaliseRoadmap,
  openTasks,
  remainingToday,
  roadmapStatus,
  taskIdFor,
  taskMinutes,
  taskStanding,
  type RoadmapDay,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import {
  DEFAULT_AVAILABILITY,
  MIN_BUFFER_MINUTES,
  MIN_DAY_MINUTES,
  TASK_CATEGORY,
  UTILISATION_TARGET,
  type CheckinFeel,
  type ReplanChange,
  type ReplanDiff,
  type RoadmapEventType,
  type RoadmapTodaySummary,
  type TaskActionRequest,
  type TaskState,
  type TaskStateEntry,
  type TaskType,
  type TopicPriority,
  type UndoSnapshot,
} from '@/lib/plan/roadmap-types'

export type ActionContext = {
  /** The moment of the action: an ISO timestamp, or a Date (the service's RoadmapContext). */
  now: string | Date
  todayIso: string
  nowMinute: number
  evidence: ReadonlySet<string>
  /** 't:{subject}|{topic}' → percentage of the latest marked attempt since the plan was built. */
  topicResults?: Record<string, number>
}

export type ActionEvent = {
  type: RoadmapEventType
  plannedMinutes?: number
  actualMinutes?: number
  feel?: CheckinFeel
  reason?: string
  meta?: Record<string, unknown>
}

export type ActionResult = {
  plan: RoadmapPlan
  taskState: TaskState
  /** The pools as they stand after the action (a too_easy check-in raises a topic's mastery). */
  pools: Record<string, TopicPriority[]>
  diff?: ReplanDiff
  changedDates: string[]
  needsHydration: string[]
  noop: boolean
  /**
   * True when blocks moved, grew, were added or let go — the plan revision
   * moves on and another tab's next action is stale. A start, a completion,
   * a skip or a plain check-in changes state only and keeps the revision.
   */
  structural: boolean
  /** Why nothing happened, for the route's log. */
  reason?: string
  event?: ActionEvent
  /** Events beside the main one (a check-in that also completed the task). */
  extraEvents?: ActionEvent[]
}

export const REPLAN_SUMMARY = 'Plans change. We protected the essentials and rebuilt today.'
export const REPLAN_NOTHING_LEFT = 'Nothing more fits today — tomorrow is already sized.'
export const ROLLOVER_SUMMARY = "Yesterday didn't happen — that's already accounted for."
/** took_longer: each one stretches that type of task by this factor, up to the cap. */
export const DURATION_SCALE_STEP = 1.25
export const DURATION_SCALE_MAX = 1.5

export function letGoLine(label: string): string {
  return `We let ${label} go for now; it comes back when there's room.`
}

// --- small pieces --------------------------------------------------------------------------

function asRoadmap(plan: HydratedPlan | RoadmapPlan): RoadmapPlan {
  return normaliseRoadmap(plan)
}

function replaceDay(plan: RoadmapPlan, day: RoadmapDay): RoadmapPlan {
  return { ...plan, days: plan.days.map((d) => (d.date === day.date ? day : d)) }
}

function examDateOf(plan: Pick<RoadmapPlan, 'subjects'>, subjectCode: string | undefined): string | undefined {
  return plan.subjects.find((s) => s.code === subjectCode)?.examDate
}

function isWork(task: Pick<RoadmapTask, 'kind'>): boolean {
  return WORK_KINDS.has(task.kind)
}

function hasClock(task: Pick<RoadmapTask, 'startsAt'>): task is RoadmapTask & { startsAt: string } {
  return typeof task.startsAt === 'string' && task.startsAt.length > 0
}

function spanOf(task: RoadmapTask, state: TaskState): Interval | null {
  if (!hasClock(task)) return null
  const start = minuteOfDay(task.startsAt)
  return { start, end: start + taskMinutes(task, state) }
}

function windowsOf(day: Pick<RoadmapDay, 'windows'>): Interval[] {
  return mergeIntervals(day.windows.map((w) => ({ start: minuteOfDay(w.start), end: minuteOfDay(w.end) })))
}

/** The day's free intervals from `from`, with the given blocks' spans cut out. */
function freeIntervalsOn(day: RoadmapDay, keep: RoadmapTask[], state: TaskState, from = 0): Interval[] {
  const windows = windowsOf(day).map((w) => ({ start: Math.max(w.start, from), end: w.end })).filter((w) => w.end - w.start >= 1)
  const cuts = keep.map((t) => spanOf(t, state)).filter((s): s is Interval => s !== null)
  return subtractIntervals(windows, cuts)
}

function isProtected(task: RoadmapTask, state: TaskState, evidence: ReadonlySet<string>): boolean {
  const standing = taskStanding(task, state, evidence)
  return standing === 'done' || standing === 'started' || task.pinned === true
}

function withClock(task: RoadmapTask, start: number, minutes: number): RoadmapTask {
  return { ...task, minutes, startsAt: clockOf(start), endsAt: clockOf(start + minutes) }
}

function breakBlock(date: string, start: number, minutes: number, n: number): RoadmapTask {
  const label = `${minutes} min off`
  return {
    kind: 'break',
    minutes,
    label,
    id: taskIdFor(date, undefined, 'break', n),
    taskType: 'break',
    category: TASK_CATEGORY.break,
    objective: label,
    why: [],
    priority: 0,
    startsAt: clockOf(start),
    endsAt: clockOf(start + minutes),
  }
}

function bufferBlock(date: string, start: number, minutes: number): RoadmapTask {
  const label = 'In hand — use it if you need it, or stop early.'
  return {
    kind: 'buffer',
    minutes,
    label,
    id: taskIdFor(date, undefined, 'buffer', 1),
    taskType: 'buffer',
    category: TASK_CATEGORY.buffer,
    objective: label,
    why: [],
    priority: 0,
    startsAt: clockOf(start),
    endsAt: clockOf(start + minutes),
  }
}

/**
 * A day rebuilt from its blocks: work and buffer recomputed, one buffer
 * block after the last block when the day has windows and time in hand
 * worth showing, blocks in clock order.
 */
function finishDay(day: RoadmapDay, blocks: RoadmapTask[], state: TaskState): RoadmapDay {
  const kept = blocks.filter((b) => b.kind !== 'buffer')
  const work = kept.reduce((n, b) => n + (isWork(b) ? taskMinutes(b, state) : 0), 0)
  const breaks = kept.reduce((n, b) => n + (b.kind === 'break' ? b.minutes : 0), 0)
  const bufferMinutes = Math.max(0, day.capacityMinutes - work - breaks)
  const out = [...kept]
  const windows = windowsOf(day)
  if (windows.length > 0) {
    if (bufferMinutes >= MIN_BUFFER_MINUTES) {
      const spans = kept.map((b) => spanOf(b, state)).filter((s): s is Interval => s !== null)
      const lastEnd = spans.reduce((n, s) => Math.max(n, s.end), 0)
      const free = subtractIntervals(windows, spans).filter((iv) => iv.end > lastEnd)
      const host = free[0]
      if (host) {
        const at = Math.max(host.start, lastEnd)
        const minutes = Math.min(bufferMinutes, host.end - at)
        if (minutes >= MIN_BUFFER_MINUTES) out.push(bufferBlock(day.date, at, minutes))
      }
    }
    out.sort((a, b) => minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
  }
  return { ...day, blocks: out, workMinutes: work, bufferMinutes }
}

function stripDestination(task: RoadmapTask): RoadmapTask {
  const { href: _h, resourceLabel: _r, question: _q, helpHref: _help, ...rest } = task
  return rest
}

type Laid = {
  placed: RoadmapTask[]
  dropped: RoadmapTask[]
  breaks: RoadmapTask[]
  /** Ids trimmed to fit a shorter slot. */
  trimmed: Set<string>
}

/**
 * Tasks laid, in the order given, into the free intervals of a day with
 * the plan's session length and break rhythm. A task takes the first slot
 * whose floor it clears; the slot's remainder is offered to the next task;
 * a task no slot holds is dropped. Without windows (a v2 day) the tasks
 * keep their own minutes and are kept in order while the capacity lasts.
 */
function layTasks(
  plan: Pick<RoadmapPlan, 'availabilityDetail'>,
  day: RoadmapDay,
  keep: RoadmapTask[],
  tasks: RoadmapTask[],
  state: TaskState,
  opts: { from: number; capacity: number; utilisation: number }
): Laid {
  const detail = plan.availabilityDetail ?? DEFAULT_AVAILABILITY
  const out: Laid = { placed: [], dropped: [], breaks: [], trimmed: new Set() }
  if (day.windows.length === 0) {
    let left = opts.capacity
    for (const t of tasks) {
      const m = taskMinutes(t, state)
      if (m <= left) {
        out.placed.push(t)
        left -= m
      } else out.dropped.push(t)
    }
    return out
  }

  const intervals = freeIntervalsOn(day, keep, state, opts.from)
  const layout = layoutDay(intervals, opts.capacity, detail.sessionLength, detail.breakRhythm, opts.utilisation)
  const slots = layout.slots.filter((s) => s.kind === 'work').map((s) => ({ start: s.start, end: s.end }))
  const breaks = layout.slots.filter((s) => s.kind === 'break')

  for (const t of tasks) {
    const wanted = taskMinutes(t, state)
    const floor = MIN_TASK_MINUTES[t.taskType]
    const at = slots.findIndex((s) => s.end - s.start >= floor)
    if (at < 0) {
      out.dropped.push(t)
      continue
    }
    const slot = slots[at]!
    const minutes = Math.min(wanted, slot.end - slot.start)
    if (minutes < wanted) out.trimmed.add(t.id)
    out.placed.push(withClock(t, slot.start, minutes))
    const rest = slot.end - (slot.start + minutes)
    if (rest >= MIN_DAY_MINUTES) slots[at] = { start: slot.start + minutes, end: slot.end }
    else slots.splice(at, 1)
  }

  const spans = [...keep, ...out.placed].map((t) => spanOf(t, state) ?? { start: minuteOfDay(t.startsAt), end: minuteOfDay(t.endsAt) })
  const free = mergeIntervals(intervals)
  let n = 0
  for (const b of breaks) {
    const iv = free.find((i) => i.start <= b.start && b.start < i.end)
    if (!iv) continue
    const before = spans.some((s) => s.end <= b.start && s.start >= iv.start)
    const after = spans.some((s) => s.start >= b.end && s.end <= iv.end)
    if (before && after) out.breaks.push(breakBlock(day.date, b.start, b.minutes, ++n))
  }
  return out
}

function diffOf(date: string, changes: ReplanChange[], protectedTaskIds: string[], summary: string): ReplanDiff {
  return { date, changes, protectedTaskIds, summary }
}

function entryFor(state: TaskState, id: string, patch: Partial<TaskStateEntry> & Pick<TaskStateEntry, 'status'>, at: string): TaskState {
  return { ...state, [id]: { ...(state[id] ?? {}), ...patch, at } }
}

// --- defer ---------------------------------------------------------------------------------------

type DeferOutcome = {
  plan: RoadmapPlan
  taskState: TaskState
  change: ReplanChange
  toDate?: string
  copyId?: string
}

/**
 * The one rule for moving a task forward: the next study day with room
 * before the subject's paper takes a copy shortened to its floor, in its
 * time in hand; when no day has room the task is let go. The copy records
 * where it landed, so it can never be deferred again.
 */
function deferTask(
  plan: RoadmapPlan,
  state: TaskState,
  task: RoadmapTask,
  day: RoadmapDay,
  at: string,
  opts: { onlyDate?: string } = {}
): DeferOutcome {
  const exam = examDateOf(plan, task.subjectCode)
  const minutes = MIN_TASK_MINUTES[task.taskType]
  const candidates = plan.days.filter(
    (d) =>
      d.date > day.date &&
      (exam === undefined || d.date < exam) &&
      (opts.onlyDate === undefined || d.date === opts.onlyDate) &&
      (d.workMinutes > 0 || d.capacityMinutes > 0) &&
      d.bufferMinutes >= minutes
  )
  for (const target of candidates) {
    const others = target.blocks.filter((b) => b.kind !== 'buffer')
    let copy: RoadmapTask | null = null
    const key = task.topic?.code ?? task.taskType
    const id = taskIdFor(target.date, task.subjectCode, key, nextTupleOrdinal(target, target.date, task.subjectCode, key))
    // The copy is a new task: it forgets the original's link (which carried the old id) and is hydrated afresh.
    const bare = stripDestination(task)
    if (target.windows.length === 0) {
      copy = { ...bare, id, minutes, pinned: undefined }
    } else {
      const free = freeIntervalsOn(target, others, state).find((iv) => iv.end - iv.start >= minutes)
      if (!free) continue
      copy = withClock({ ...bare, id, pinned: undefined }, free.start, minutes)
    }
    const nextState = entryFor(
      entryFor(state, task.id, { status: 'deferred', deferredTo: target.date }, at),
      copy.id,
      { status: 'shortened', minutes, deferredTo: target.date },
      at
    )
    const nextTarget = finishDay(target, [...others, copy], nextState)
    return {
      plan: replaceDay(plan, nextTarget),
      taskState: nextState,
      change: { taskId: task.id, kind: 'moved', label: task.label, detail: `Moved to ${formatPlanDate(target.date)}, shortened to ${minutes} min.` },
      toDate: target.date,
      copyId: copy.id,
    }
  }
  return {
    plan,
    taskState: entryFor(state, task.id, { status: 'dropped' }, at),
    change: { taskId: task.id, kind: 'dropped', label: task.label, detail: letGoLine(task.label) },
  }
}

// --- check-in effects ------------------------------------------------------------------------

/** A concept refresh on the topic goes first on the next study day; that day's tasks shift later and the last one may drop. */
function insertConcept(
  plan: RoadmapPlan,
  state: TaskState,
  evidence: ReadonlySet<string>,
  task: RoadmapTask,
  todayIso: string,
  at: string,
  opts: { targetDate?: string } = {}
): { plan: RoadmapPlan; taskState: TaskState; changes: ReplanChange[]; newId?: string; date?: string } {
  if (!task.subjectCode || !task.topic) return { plan, taskState: state, changes: [] }
  const exam = examDateOf(plan, task.subjectCode)
  const target = opts.targetDate
    ? (plan.days.find((d) => d.date === opts.targetDate && (exam === undefined || d.date < exam)) ?? null)
    : nextStudyDay(plan, todayIso, exam)
  if (!target) return { plan, taskState: state, changes: [] }

  const windows = windowsOf(target)
  let minutes = stepMinutesFor('concept', plan.durationScale)
  if (windows[0]) minutes = Math.min(minutes, windows[0].end - windows[0].start)
  if (minutes < MIN_TASK_MINUTES.concept) return { plan, taskState: state, changes: [] }

  const objective = objectiveFor('concept', { topic: task.topic.name, subject: task.subjectLabel ?? '', minutes })
  const concept: RoadmapTask = {
    kind: TASK_KIND.concept,
    minutes,
    subjectCode: task.subjectCode,
    subjectLabel: task.subjectLabel,
    topic: task.topic,
    label: objective,
    id: taskIdFor(target.date, task.subjectCode, task.topic.code, nextTupleOrdinal(target, target.date, task.subjectCode, task.topic.code)),
    taskType: 'concept',
    category: TASK_CATEGORY.concept,
    objective,
    why: task.why.map((w) => ({ ...w })),
    priority: task.priority,
    loopStep: 'repair',
    provisional: task.provisional,
  }

  const keep = target.blocks.filter((b) => b.kind !== 'break' && b.kind !== 'buffer' && (isProtected(b, state, evidence) || isSettled(taskStanding(b, state, evidence))))
  const movable = target.blocks.filter((b) => isWork(b) && !keep.includes(b))
  const keptWork = keep.reduce((n, b) => n + (isWork(b) ? taskMinutes(b, state) : 0), 0)
  const capacity = target.windows.length === 0 ? Math.max(0, target.workMinutes - keptWork) + minutes : Math.max(0, target.capacityMinutes - keptWork)
  const laid = layTasks(plan, target, keep, [concept, ...movable], state, { from: 0, capacity, utilisation: target.windows.length === 0 ? 1 : UTILISATION_TARGET })

  const changes: ReplanChange[] = []
  let nextState = state
  const placedById = new Map(laid.placed.map((t) => [t.id, t]))
  if (!placedById.has(concept.id)) return { plan, taskState: state, changes: [] }
  changes.push({ taskId: concept.id, kind: 'inserted', label: concept.label, detail: 'A short concept refresh goes first.' })
  for (const t of movable) {
    const now = placedById.get(t.id)
    if (!now) {
      nextState = entryFor(nextState, t.id, { status: 'dropped' }, at)
      changes.push({ taskId: t.id, kind: 'dropped', label: t.label, detail: letGoLine(t.label) })
    } else if (now.startsAt !== t.startsAt) {
      changes.push({ taskId: t.id, kind: 'moved', label: t.label, detail: `Now at ${now.startsAt}.` })
    }
  }
  const blocks = [...keep, ...laid.placed, ...laid.breaks]
  const day = finishDay(target, blocks, nextState)
  return { plan: replaceDay(plan, day), taskState: nextState, changes, newId: concept.id, date: target.date }
}

/** took_longer: this type of task gets more time from now on, and every future undone one grows into its slot. */
function stretchType(
  plan: RoadmapPlan,
  state: TaskState,
  evidence: ReadonlySet<string>,
  type: TaskType,
  ctx: ActionContext,
  exceptId: string
): { plan: RoadmapPlan; changes: ReplanChange[]; dates: string[] } {
  const current = plan.durationScale?.[type] ?? 1
  const scale = Math.min(DURATION_SCALE_MAX, current * DURATION_SCALE_STEP)
  const durationScale = { ...(plan.durationScale ?? {}), [type]: scale }
  const wanted = stepMinutesFor(type, durationScale)
  const changes: ReplanChange[] = []
  const dates: string[] = []
  const days = plan.days.map((day) => {
    if (day.date < ctx.todayIso) return day
    // Time in hand is not an edge: a task may grow into the buffer after it.
    const timed = day.blocks.filter((b) => hasClock(b) && b.kind !== 'buffer').sort((a, b) => minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
    const windows = windowsOf(day)
    let touched = false
    const blocks = day.blocks.map((t) => {
      if (t.taskType !== type || t.id === exceptId || !isWork(t)) return t
      if (taskStanding(t, state, evidence) !== 'todo') return t
      const have = taskMinutes(t, state)
      if (wanted <= have) return t
      if (!hasClock(t)) return t
      const start = minuteOfDay(t.startsAt)
      if (day.date === ctx.todayIso && start < ctx.nowMinute) return t
      const next = timed.find((o) => o.id !== t.id && minuteOfDay(o.startsAt) >= start + have)
      const window = windows.find((w) => w.start <= start && start < w.end)
      const limit = Math.min(next ? minuteOfDay(next.startsAt) : Number.POSITIVE_INFINITY, window ? window.end : Number.POSITIVE_INFINITY)
      const minutes = Math.min(wanted, limit - start)
      if (minutes <= have) return t
      touched = true
      changes.push({ taskId: t.id, kind: 'resized', label: t.label, detail: `${have} → ${minutes} min.` })
      return withClock(t, start, minutes)
    })
    if (!touched) return day
    dates.push(day.date)
    return finishDay(day, blocks, state)
  })
  return { plan: { ...plan, days, durationScale }, changes, dates }
}

// --- the action reducer -------------------------------------------------------------------------

export function applyTaskAction(
  planIn: HydratedPlan | RoadmapPlan,
  taskState: TaskState,
  pools: Record<string, TopicPriority[]>,
  req: TaskActionRequest,
  ctx: ActionContext
): ActionResult {
  const plan = asRoadmap(planIn)
  const noop = (reason: string): ActionResult => ({ plan, taskState, pools, changedDates: [], needsHydration: [], noop: true, structural: false, reason })
  const found = findTask(plan, req.taskId)
  if (!found) return noop('no such task')
  const { day, task, index } = found
  if (!isWork(task) && req.action !== 'pin' && req.action !== 'unpin') return noop('not a work task')
  const standing = taskStanding(task, taskState, ctx.evidence)
  const entry = taskState[task.id]
  const planned = taskMinutes(task, taskState)
  const at = typeof ctx.now === 'string' ? ctx.now : ctx.now.toISOString()
  const undone = standing === 'todo' || standing === 'started'

  switch (req.action) {
    case 'start': {
      if (standing !== 'todo') return noop(`cannot start a ${standing} task`)
      return {
        plan,
        taskState: entryFor(taskState, task.id, { status: 'started' }, at),
        pools,
        changedDates: [day.date],
        needsHydration: [],
        noop: false,
        structural: false,
        event: { type: 'task_started', plannedMinutes: planned },
      }
    }
    case 'complete': {
      if (!undone) return noop(`cannot complete a ${standing} task`)
      const actual = typeof req.actualMinutes === 'number' && req.actualMinutes >= 0 ? Math.round(req.actualMinutes) : undefined
      return {
        plan,
        taskState: entryFor(taskState, task.id, { status: 'done', actualMinutes: actual }, at),
        pools,
        changedDates: [day.date],
        needsHydration: [],
        noop: false,
        structural: false,
        event: { type: 'task_completed', plannedMinutes: planned, actualMinutes: actual },
      }
    }
    case 'skip': {
      if (!undone) return noop(`cannot skip a ${standing} task`)
      const reason = req.reason?.trim() || undefined
      return {
        plan,
        taskState: entryFor(taskState, task.id, { status: 'skipped', reason }, at),
        pools,
        changedDates: [day.date],
        needsHydration: [],
        noop: false,
        structural: false,
        event: { type: 'task_skipped', plannedMinutes: planned, reason },
      }
    }
    case 'shorten': {
      if (!undone) return noop(`cannot shorten a ${standing} task`)
      const asked = typeof req.minutes === 'number' ? Math.round(req.minutes) : Math.floor(planned / 2)
      const minutes = Math.max(MIN_TASK_MINUTES[task.taskType], Math.min(asked, planned))
      if (minutes >= planned) return noop('already at its floor')
      // A started task stays started: shortening it must not drop its protection from replans.
      const nextState = entryFor(taskState, task.id, { status: standing === 'started' ? 'started' : 'shortened', minutes }, at)
      const block = hasClock(task) ? withClock(task, minuteOfDay(task.startsAt), minutes) : { ...task, minutes }
      const nextDay = finishDay(day, day.blocks.map((b, i) => (i === index ? block : b)), nextState)
      return {
        plan: replaceDay(plan, nextDay),
        taskState: nextState,
        pools,
        diff: diffOf(day.date, [{ taskId: task.id, kind: 'shortened', label: task.label, detail: `${planned} → ${minutes} min.` }], [], `Shortened to ${minutes} minutes.`),
        changedDates: [day.date],
        needsHydration: [],
        noop: false,
        structural: true,
        event: { type: 'task_shortened', plannedMinutes: planned, actualMinutes: minutes },
      }
    }
    case 'defer': {
      if (entry?.deferredTo) return noop('already deferred once')
      if (!undone) return noop(`cannot defer a ${standing} task`)
      const out = deferTask(plan, taskState, task, day, at)
      return {
        plan: out.plan,
        taskState: out.taskState,
        pools,
        diff: diffOf(day.date, [out.change], [], out.toDate ? `Moved to ${formatPlanDate(out.toDate)}.` : letGoLine(task.label)),
        changedDates: out.toDate ? [day.date, out.toDate] : [day.date],
        needsHydration: out.copyId ? [out.copyId] : [],
        noop: false,
        structural: true,
        event: { type: 'task_deferred', plannedMinutes: planned, meta: { to: out.toDate ?? null } },
      }
    }
    case 'swap': {
      if (!undone) return noop(`cannot swap a ${standing} task`)
      if (!task.subjectCode || !task.topic) return noop('no topic to swap')
      const onDate = new Set(day.blocks.filter((b) => b.subjectCode === task.subjectCode && b.topic).map((b) => b.topic!.code))
      onDate.add(task.topic.code)
      const next = eligibleTopics(pools[task.subjectCode] ?? [], onDate, new Set())[0]
      if (!next) return noop('nothing to swap in')
      const objective = objectiveFor(task.taskType, { topic: next.name, subject: task.subjectLabel ?? '', minutes: planned })
      const swapped: RoadmapTask = {
        ...stripDestination(task),
        id: taskIdFor(day.date, task.subjectCode, next.code, nextTupleOrdinal(day, day.date, task.subjectCode, next.code)),
        topic: { code: next.code, name: next.name, source: 'syllabus', weight: 0 },
        label: objective,
        objective,
        why: next.why.map((w) => ({ ...w })),
        priority: next.score,
      }
      const { [task.id]: _gone, ...rest } = taskState
      const nextState = entryFor(rest, swapped.id, { status: standing === 'started' ? 'started' : 'swapped', swappedFrom: task.topic.code, minutes: entry?.minutes }, at)
      const nextDay = finishDay(day, day.blocks.map((b, i) => (i === index ? swapped : b)), nextState)
      return {
        plan: replaceDay(plan, nextDay),
        taskState: nextState,
        pools,
        diff: diffOf(day.date, [{ taskId: swapped.id, kind: 'swapped', label: swapped.label, detail: `Swapped in for ${task.topic.name}.` }], [], `Swapped in ${next.name}.`),
        changedDates: [day.date],
        needsHydration: [swapped.id],
        noop: false,
        structural: true,
        event: { type: 'task_swapped', plannedMinutes: planned, meta: { from: task.topic.code, to: next.code } },
      }
    }
    case 'pin':
    case 'unpin': {
      const pinned = req.action === 'pin'
      if (Boolean(task.pinned) === pinned) return noop('already so')
      const block: RoadmapTask = { ...task }
      if (pinned) block.pinned = true
      else delete block.pinned
      const nextDay = { ...day, blocks: day.blocks.map((b, i) => (i === index ? block : b)) }
      return { plan: replaceDay(plan, nextDay), taskState, pools, changedDates: [day.date], needsHydration: [], noop: false, structural: true }
    }
    case 'checkin': {
      const feel = req.feel
      if (!feel) return noop('no feeling given')
      const reason = req.reason?.trim() || undefined
      const actual = typeof req.actualMinutes === 'number' && req.actualMinutes >= 0 ? Math.round(req.actualMinutes) : undefined
      let nextPlan = plan
      // A check-in on a task still to do is the completion the student skipped
      // past, and is recorded as one — unless the feeling is "I was busy",
      // which moves the task instead of finishing it.
      const completesIt = undone && feel !== 'was_busy'
      let nextState =
        completesIt || entry
          ? entryFor(taskState, task.id, { status: completesIt ? 'done' : entry!.status, feel, reason, actualMinutes: actual ?? entry?.actualMinutes }, at)
          : taskState
      let nextPools = pools
      const changes: ReplanChange[] = []
      const changedDates = new Set<string>([day.date])
      const needsHydration: string[] = []
      let diffDate = day.date

      if (feel === 'too_easy' && task.subjectCode && task.topic) {
        for (const d of nextPlan.days) {
          if (d.date < day.date) continue
          for (const t of d.blocks) {
            if (t.id === task.id || t.subjectCode !== task.subjectCode || t.topic?.code !== task.topic.code) continue
            if (t.loopStep !== 'repair' && t.loopStep !== 'recall') continue
            if (isSettled(taskStanding(t, nextState, ctx.evidence))) continue
            nextState = entryFor(nextState, t.id, { status: 'dropped' }, at)
            changes.push({ taskId: t.id, kind: 'dropped', label: t.label, detail: 'Too easy: the repair steps on this topic are let go; the marked question stays.' })
            changedDates.add(d.date)
          }
        }
        const pool = pools[task.subjectCode]
        if (pool) {
          nextPools = { ...pools, [task.subjectCode]: pool.map((p) => (p.code === task.topic!.code ? { ...p, mastery: Math.max(0.7, p.mastery) } : p)) }
        }
      } else if ((feel === 'too_hard' || feel === 'need_help') && task.subjectCode && task.topic) {
        const ins = insertConcept(nextPlan, nextState, ctx.evidence, task, ctx.todayIso, at)
        nextPlan = ins.plan
        nextState = ins.taskState
        changes.push(...ins.changes)
        if (ins.newId) needsHydration.push(ins.newId)
        if (ins.date) {
          changedDates.add(ins.date)
          diffDate = ins.date
        }
      } else if (feel === 'took_longer') {
        const st = stretchType(nextPlan, nextState, ctx.evidence, task.taskType, ctx, task.id)
        nextPlan = st.plan
        changes.push(...st.changes)
        for (const d of st.dates) changedDates.add(d)
      } else if (feel === 'was_busy') {
        // The task itself is done by now (the sheet opens after Done), so what
        // moves is the topic's next open step today; a task still to do moves itself.
        const mover = busyMover(nextPlan, day, task, nextState, ctx.evidence)
        if (mover) {
          const out = deferTask(nextPlan, nextState, mover, day, at)
          nextPlan = out.plan
          nextState = mover.id === task.id ? { ...out.taskState, [task.id]: { ...out.taskState[task.id]!, feel, reason } } : out.taskState
          changes.push(out.change)
          if (out.toDate) changedDates.add(out.toDate)
          if (out.copyId) needsHydration.push(out.copyId)
        }
      }

      const diff = changes.length > 0 ? diffOf(diffDate, changes, [], effectSummary(feel)) : undefined
      if (diff) nextPlan = { ...nextPlan, lastDiffDate: ctx.todayIso, lastDiff: diff }
      const event: ActionEvent = { type: 'task_checkin', plannedMinutes: planned, actualMinutes: actual, feel, reason }
      return {
        plan: nextPlan,
        taskState: nextState,
        pools: nextPools,
        diff,
        changedDates: [...changedDates],
        needsHydration,
        noop: false,
        structural: changes.length > 0,
        event,
        extraEvents: completesIt ? [{ type: 'task_completed', plannedMinutes: planned, actualMinutes: actual, meta: { byCheckin: true } }] : undefined,
      }
    }
  }
  return noop('unknown action')
}

function effectSummary(feel: CheckinFeel): string {
  switch (feel) {
    case 'too_easy':
      return 'The refresh and recall on this topic are let go.'
    case 'too_hard':
    case 'need_help':
      return 'A short refresh goes first on your next study day.'
    case 'took_longer':
      return 'Tasks like this get a little more time.'
    case 'was_busy':
      return 'The rest of this topic moves to the next day with room.'
    case 'about_right':
      return 'Nothing changes.'
  }
}

/** What "I was busy" would move: the task itself while it is still to do, otherwise the topic's next open step on the same day. */
function busyMover(plan: RoadmapPlan, day: RoadmapDay, task: RoadmapTask, state: TaskState, evidence: ReadonlySet<string>): RoadmapTask | null {
  void plan
  const standing = taskStanding(task, state, evidence)
  if ((standing === 'todo' || standing === 'started') && !state[task.id]?.deferredTo) return task
  if (!task.subjectCode || !task.topic) return null
  return (
    day.blocks.find((t) => {
      if (t.id === task.id || !isWork(t) || t.subjectCode !== task.subjectCode || t.topic?.code !== task.topic!.code) return false
      if (state[t.id]?.deferredTo) return false
      const s = taskStanding(t, state, evidence)
      return s === 'todo' || s === 'started'
    }) ?? null
  )
}

/**
 * The check-in feelings that would change something for this task, so the
 * sheet never promises an effect the reducer will not make. about_right and
 * took_longer always apply; the rest need a topic and something to act on.
 */
export function availableFeels(
  planIn: HydratedPlan | RoadmapPlan,
  task: RoadmapTask,
  state: TaskState,
  evidence: ReadonlySet<string>,
  todayIso: string
): CheckinFeel[] {
  const plan = asRoadmap(planIn)
  const found = findTask(plan, task.id)
  const day = found?.day ?? null
  const feels: CheckinFeel[] = []
  const topical = Boolean(task.subjectCode && task.topic)
  if (topical) {
    const repairAhead = plan.days.some(
      (d) =>
        d.date >= (day?.date ?? todayIso) &&
        d.blocks.some(
          (t) =>
            t.id !== task.id &&
            t.subjectCode === task.subjectCode &&
            t.topic?.code === task.topic!.code &&
            (t.loopStep === 'repair' || t.loopStep === 'recall') &&
            !isSettled(taskStanding(t, state, evidence))
        )
    )
    if (repairAhead) feels.push('too_easy')
  }
  feels.push('about_right')
  if (topical && nextStudyDay(plan, todayIso, examDateOf(plan, task.subjectCode))) feels.push('too_hard')
  feels.push('took_longer')
  if (day && busyMover(plan, day, task, state, evidence)) feels.push('was_busy')
  if (topical) feels.push('need_help')
  return feels
}

// --- replan today --------------------------------------------------------------------------------

export function replanToday(
  planIn: HydratedPlan | RoadmapPlan,
  taskState: TaskState,
  pools: Record<string, TopicPriority[]>,
  opts: { date: string; nowMinute: number; minutesLeft?: number; evidence: ReadonlySet<string> }
): { plan: RoadmapPlan; taskState: TaskState; diff: ReplanDiff; needsHydration: string[]; changedDates: string[]; noop: boolean } {
  void pools // the remainder is rebuilt from today's own tasks; the pools feed rebuilds, not replans
  const plan = asRoadmap(planIn)
  const day = plan.days.find((d) => d.date === opts.date)
  if (!day) return { plan, taskState, diff: diffOf(opts.date, [], [], REPLAN_SUMMARY), needsHydration: [], changedDates: [], noop: true }

  const work = day.blocks.filter(isWork)
  const protectedTasks = work.filter((t) => isProtected(t, taskState, opts.evidence))
  const settled = work.filter((t) => !protectedTasks.includes(t) && isSettled(taskStanding(t, taskState, opts.evidence)))
  const movable = work
    .filter((t) => !protectedTasks.includes(t) && !settled.includes(t))
    .sort((a, b) => b.priority - a.priority || minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
  const past = (t: RoadmapTask) => hasClock(t) && minuteOfDay(t.endsAt) <= opts.nowMinute
  const history = [...settled.filter(past), ...day.blocks.filter((b) => b.kind === 'break' && past(b))]

  const windows = windowsOf(day)
  const lastEnd = windows.reduce((n, w) => Math.max(n, w.end), 0)
  const clockLeft = windows.length > 0 ? Math.max(0, lastEnd - opts.nowMinute) : Number.POSITIVE_INFINITY
  const capacity = Math.min(opts.minutesLeft ?? Number.POSITIVE_INFINITY, clockLeft)
  // Nothing left to lay into: a replan would only let everything go, and tomorrow is already sized. Say so instead.
  if (capacity < MIN_DAY_MINUTES && movable.length > 0) {
    return { plan, taskState, diff: diffOf(opts.date, [], protectedTasks.map((t) => t.id), REPLAN_NOTHING_LEFT), needsHydration: [], changedDates: [], noop: true }
  }
  const laid = layTasks(plan, day, protectedTasks, movable, taskState, {
    from: opts.nowMinute,
    capacity: Number.isFinite(capacity) ? capacity : day.workMinutes,
    utilisation: typeof opts.minutesLeft === 'number' ? 1 : UTILISATION_TARGET,
  })

  const changes: ReplanChange[] = []
  let nextState = taskState
  for (const t of protectedTasks) changes.push({ taskId: t.id, kind: 'kept', label: t.label })
  const placedById = new Map(laid.placed.map((t) => [t.id, t]))
  for (const t of movable) {
    const now = placedById.get(t.id)
    if (!now) {
      nextState = entryFor(nextState, t.id, { status: 'dropped' }, `${opts.date}T00:00:00.000Z`)
      changes.push({ taskId: t.id, kind: 'dropped', label: t.label, detail: letGoLine(t.label) })
    } else if (laid.trimmed.has(t.id)) {
      nextState = entryFor(nextState, t.id, { status: 'shortened', minutes: now.minutes }, `${opts.date}T00:00:00.000Z`)
      changes.push({ taskId: t.id, kind: 'shortened', label: t.label, detail: `Now ${now.minutes} min at ${now.startsAt}.` })
    } else if (now.startsAt !== t.startsAt) {
      changes.push({ taskId: t.id, kind: 'moved', label: t.label, detail: `Now at ${now.startsAt}.` })
    } else {
      changes.push({ taskId: t.id, kind: 'kept', label: t.label })
    }
  }

  const blocks = [...history, ...protectedTasks, ...laid.placed, ...laid.breaks]
  const nextDay = finishDay(day, blocks, nextState)
  const diff = diffOf(opts.date, changes, protectedTasks.map((t) => t.id), REPLAN_SUMMARY)
  const nextPlan: RoadmapPlan = { ...replaceDay(plan, nextDay), lastDiffDate: opts.date, lastDiff: diff }
  return {
    plan: nextPlan,
    taskState: nextState,
    diff,
    needsHydration: [],
    changedDates: [opts.date],
    noop: false,
  }
}

// --- rollover ------------------------------------------------------------------------------------

export function rolloverDay(
  planIn: HydratedPlan | RoadmapPlan,
  taskState: TaskState,
  pools: Record<string, TopicPriority[]>,
  opts: { fromDate: string; toDate: string; evidence: ReadonlySet<string>; topicResults?: Record<string, number> }
): { plan: RoadmapPlan; taskState: TaskState; pools: Record<string, TopicPriority[]>; diff?: ReplanDiff; needsHydration: string[]; noop: boolean } | null {
  let plan = asRoadmap(planIn)
  const from = plan.days.find((d) => d.date === opts.fromDate)
  if (!from) return null
  const at = `${opts.toDate}T00:00:00.000Z`
  let state = taskState
  let nextPools = pools
  const changes: ReplanChange[] = []
  const needsHydration: string[] = []

  // (1) A marked diagnostic settles its topic's provisional steps: a sound
  // result skips straight to the question (the repair is let go); a weak
  // result keeps the repair, and where the provisional loop had none — the
  // student rated the topic confident — a concept refresh is put in front of
  // the marked question. The pool learns the result either way.
  const results = opts.topicResults ?? {}
  const settledTopics = new Set<string>()
  for (const [key, pct] of Object.entries(results)) {
    if (!key.startsWith('t:')) continue
    const [subject, topic] = key.slice(2).split('|')
    if (!subject || !topic) continue
    const weak = pct < WEAK_BELOW_PCT
    let hasRepair = false
    let firstProve: RoadmapTask | null = null
    const days = plan.days.map((d) => {
      let touched = false
      const blocks = d.blocks.map((t) => {
        if (!t.provisional || t.subjectCode !== subject || t.topic?.code !== topic) return t
        if (d.date < opts.toDate || isSettled(taskStanding(t, state, opts.evidence))) return t
        touched = true
        settledTopics.add(key)
        if (t.loopStep === 'repair') hasRepair = true
        if (t.loopStep === 'prove' && !firstProve) firstProve = t
        if (!weak && t.loopStep === 'repair') {
          state = entryFor(state, t.id, { status: 'dropped' }, at)
          changes.push({ taskId: t.id, kind: 'dropped', label: t.label, detail: 'Your marked answer shows the topic holds; the repair step is let go.' })
        }
        return { ...t, provisional: false }
      })
      return touched ? { ...d, blocks } : d
    })
    plan = { ...plan, days }
    if (!settledTopics.has(key)) continue
    if (weak && !hasRepair && firstProve) {
      const ins = insertConcept(plan, state, opts.evidence, firstProve, opts.fromDate, at, { targetDate: opts.toDate })
      plan = ins.plan
      state = ins.taskState
      changes.push(...ins.changes.map((c) => (c.kind === 'inserted' ? { ...c, detail: 'Your marked answer found this topic weak, so a concept refresh goes before the question.' } : c)))
      if (ins.newId) needsHydration.push(ins.newId)
    }
    const pool = nextPools[subject]
    if (pool?.some((p) => p.code === topic)) {
      nextPools = {
        ...nextPools,
        [subject]: pool.map((p) => (p.code === topic ? { ...p, mastery: Math.max(0, Math.min(1, pct / 100)), uncertainty: 0, loop: weak ? 'weak' : 'strong' } : p)),
      }
    }
  }

  // (2) One undone task moves forward, once; the rest return to the pool without a word.
  const undone = from.blocks
    .filter(isWork)
    .filter((t) => {
      const s = taskStanding(t, state, opts.evidence)
      return (s === 'todo' || s === 'started') && !state[t.id]?.deferredTo
    })
    .sort((a, b) => b.priority - a.priority || minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
  if (undone.length === 0 && settledTopics.size === 0) return null

  if (undone.length > 0) {
    const [first, ...rest] = undone
    const out = deferTask(plan, state, first!, from, at, { onlyDate: opts.toDate })
    plan = out.plan
    state = out.taskState
    changes.push(out.change)
    if (out.copyId) needsHydration.push(out.copyId)
    for (const t of rest) state = entryFor(state, t.id, { status: 'dropped' }, at)
  }

  const kept = plan.days.find((d) => d.date === opts.toDate)?.blocks.filter((t) => t.pinned) ?? []
  for (const t of kept) changes.push({ taskId: t.id, kind: 'kept', label: t.label })
  const diff = diffOf(opts.toDate, changes, kept.map((t) => t.id), ROLLOVER_SUMMARY)
  if (changes.length > 0) plan = { ...plan, lastDiffDate: opts.toDate, lastDiff: diff }
  return { plan, taskState: state, pools: nextPools, diff, needsHydration, noop: false }
}

// --- undo ------------------------------------------------------------------------------------------

/** Every date a snapshot covers: the shown day first, then the others the change reached. */
export function undoDates(snap: UndoSnapshot): string[] {
  return [snap.date, ...(snap.otherDays ?? []).map((d) => d.date).filter((d) => d !== snap.date)]
}

/**
 * The undo point before a change: the days it will touch (blocks and task
 * state), plus the plan-level marks it may set. A defer or a rollover
 * touches two days; snapshotting only the one the diff is shown for would
 * leave a copy behind or lose the original.
 */
export function undoSnapshotFor(plan: HydratedPlan | RoadmapPlan, taskState: TaskState, date: string, summary: string, dates: string[] = []): UndoSnapshot {
  const p = asRoadmap(plan)
  const all = [...new Set([date, ...dates])]
  const dayOf = (d: string) => p.days.find((x) => x.date === d)
  const taskStateForDay: TaskState = {}
  for (const [id, entry] of Object.entries(taskState)) if (all.some((d) => id.startsWith(`${d}-`))) taskStateForDay[id] = entry
  const day = dayOf(date)
  const otherDays = all
    .filter((d) => d !== date)
    .map((d) => {
      const x = dayOf(d)
      return { date: d, blocks: x ? x.blocks.map((b) => ({ ...b })) : [], workMinutes: x?.workMinutes ?? 0, bufferMinutes: x?.bufferMinutes, focus: x?.focus ?? '' }
    })
  return {
    revision: p.revision,
    date,
    blocks: day ? day.blocks.map((b) => ({ ...b })) : [],
    workMinutes: day?.workMinutes ?? 0,
    bufferMinutes: day?.bufferMinutes,
    focus: day?.focus ?? '',
    taskStateForDay,
    summary,
    otherDays: otherDays.length > 0 ? otherDays : undefined,
    lastDiffDate: p.lastDiffDate ?? null,
    lastDiff: p.lastDiff ?? null,
    durationScale: p.durationScale ?? null,
  }
}

/** Restores every day the snapshot holds. Restored blocks keep their stored destinations, so nothing needs hydrating. */
export function applyUndo(planIn: HydratedPlan | RoadmapPlan, taskState: TaskState, snap: UndoSnapshot): { plan: RoadmapPlan; taskState: TaskState; needsHydration: string[] } {
  let plan = asRoadmap(planIn)
  const dates = undoDates(snap)
  const nextState: TaskState = {}
  for (const [id, entry] of Object.entries(taskState)) if (!dates.some((d) => id.startsWith(`${d}-`))) nextState[id] = entry
  Object.assign(nextState, snap.taskStateForDay)
  const days = [{ date: snap.date, blocks: snap.blocks, workMinutes: snap.workMinutes, bufferMinutes: snap.bufferMinutes, focus: snap.focus }, ...(snap.otherDays ?? [])]
  for (const was of days) {
    const day = plan.days.find((d) => d.date === was.date)
    if (!day) continue
    plan = replaceDay(plan, {
      ...day,
      blocks: was.blocks as RoadmapTask[],
      workMinutes: was.workMinutes,
      bufferMinutes: was.bufferMinutes ?? day.bufferMinutes,
      focus: was.focus,
    })
  }
  // The marks the change set on the plan go back too, so the chip and "See what changed" agree with the day.
  const { lastDiffDate: _ld, lastDiff: _lf, durationScale: _ds, ...rest } = plan
  const restored: RoadmapPlan = { ...rest, days: plan.days } as RoadmapPlan
  if ('lastDiffDate' in snap) {
    if (snap.lastDiffDate) restored.lastDiffDate = snap.lastDiffDate
    if (snap.lastDiff) restored.lastDiff = snap.lastDiff
    if (snap.durationScale) restored.durationScale = snap.durationScale
  } else {
    // An older snapshot said nothing about the plan-level marks: keep them as they are.
    if (plan.lastDiffDate) restored.lastDiffDate = plan.lastDiffDate
    if (plan.lastDiff) restored.lastDiff = plan.lastDiff
    if (plan.durationScale) restored.durationScale = plan.durationScale
  }
  return { plan: restored, taskState: nextState, needsHydration: [] }
}

// --- the today summary ---------------------------------------------------------------------------

/**
 * The summary is written once per change and read many times, so it
 * carries the two numbers the clock-dependent field is made of: the open
 * tasks' minutes and the end of the day's last window. GET /api/plan/today
 * can then answer from the stored row alone — remainingMinutesAt() redoes
 * the one sum that moves with the clock — instead of loading the plan and
 * the marked attempts on every read.
 */
export function todaySummaryFor(
  planIn: HydratedPlan | RoadmapPlan,
  taskState: TaskState,
  evidence: ReadonlySet<string>,
  done: DoneDays,
  todayIso: string,
  nowMinute: number,
  hrefOf?: (id: string) => string | undefined
): RoadmapTodaySummary {
  const plan = asRoadmap(planIn)
  if (plan.days.length === 0) return { hasPlan: false }
  const exam = nearestExam(plan, todayIso)
  const base: RoadmapTodaySummary = {
    hasPlan: true,
    date: todayIso,
    revision: plan.revision,
    daysLeft: planLength(todayIso, plan.examDate),
    nearestExam: exam ? { label: exam.label, date: exam.date, daysLeft: exam.daysLeft } : undefined,
    status: roadmapStatus(plan, taskState, evidence, done, todayIso),
    feasibility: plan.feasibility?.state,
  }
  const day = plan.days.find((d) => d.date === todayIso)
  if (!day) return base
  const hero = heroFor(plan, day, taskState, evidence, nowMinute)
  const summary: RoadmapTodaySummary = {
    ...base,
    dayNumber: day.day,
    daysLeft: day.daysLeft,
    remainingMinutes: remainingToday(day, taskState, evidence, nowMinute),
    openMinutes: openTasks(day, taskState, evidence).reduce((n, t) => n + taskMinutes(t, taskState), 0),
    windowEndMinute: day.windows.length > 0 ? Math.max(...day.windows.map((w) => minuteOfDay(w.end))) : null,
  }
  if (hero.kind === 'task') {
    const t = hero.task
    summary.nextTask = {
      id: t.id,
      label: t.label,
      objective: t.objective,
      minutes: hero.minutes,
      href: hrefOf?.(t.id) ?? t.href,
      subjectLabel: t.subjectLabel,
      category: t.category,
      taskType: t.taskType,
      ...(t.topic?.name ? { topic: t.topic.name } : {}),
      startsAt: t.startsAt,
    }
  }
  return summary
}

/**
 * Whether a stored summary can answer GET /api/plan/today on its own: it
 * is today's, it carries the clock inputs (a summary written before they
 * existed cannot be re-timed), and the lazy rollover has nothing to settle
 * (last_rolled_date is on or after today). Anything else takes the full
 * path, which also rewrites the stored summary.
 */
export function storedSummaryServes(
  stored: RoadmapTodaySummary | null | undefined,
  todayIso: string,
  lastRolledDate: string | null | undefined,
  revision?: number
): stored is RoadmapTodaySummary & { openMinutes: number; windowEndMinute: number | null } {
  if (!stored || !stored.hasPlan || stored.date !== todayIso) return false
  if (typeof stored.openMinutes !== 'number' || stored.windowEndMinute === undefined) return false
  if (!lastRolledDate || lastRolledDate < todayIso) return false
  if (typeof revision === 'number' && stored.revision !== revision) return false
  return true
}

/**
 * The stored summary re-timed to now, the same arithmetic remainingToday()
 * and heroFor() do on the plan: the open minutes capped by what is left of
 * the last window (no windows → no cap); the next task shortened to the
 * minutes left, and dropped when fewer than a real task's worth remain,
 * just as the hero turns into "nothing more today".
 */
export function remainingMinutesAt(stored: RoadmapTodaySummary, nowMinute: number): RoadmapTodaySummary {
  const open = Math.max(0, stored.openMinutes ?? stored.remainingMinutes ?? 0)
  const end = stored.windowEndMinute
  const left = typeof end === 'number' ? Math.max(0, end - nowMinute) : Number.POSITIVE_INFINITY
  const out: RoadmapTodaySummary = { ...stored, remainingMinutes: Math.min(open, left) }
  if (stored.nextTask) {
    if (left < MIN_DAY_MINUTES) delete out.nextTask
    else if (left < stored.nextTask.minutes) out.nextTask = { ...stored.nextTask, minutes: Math.floor(left) }
  }
  return out
}
