import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  RoadmapConflictError,
  RoadmapStaleError,
  dayMutationResponse,
  dayOfTask,
  doneAfterTasks,
  hydrateTasks,
  mutateRoadmap,
  taskById,
  type RoadmapWrite,
} from '@/lib/plan/study-plan-service'
import { applyTaskAction, undoSnapshotFor } from '@/lib/plan/task-actions'
import { normaliseRoadmap } from '@/lib/plan/roadmap-view'
import type { RoadmapEventInput } from '@/lib/plan/events'
import {
  CHECKIN_FEEL_LABEL,
  type CheckinFeel,
  type ReplanDiff,
  type RoadmapEventType,
  type TaskAction,
  type TaskActionRequest,
} from '@/lib/plan/roadmap-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/plan/task — one action on one task: start, complete, shorten,
 * skip, defer, carry (to a chosen day), swap, check in, pin, unpin
 * (TaskActionRequest).
 *
 * The body carries the plan revision the client is looking at; a mismatch
 * is a 409 { error: 'stale', revision } so the client refetches instead of
 * acting on a day that has since been replanned. Repeating a terminal
 * action is a no-op that returns the current day. The response is one day
 * (DayMutationResponse), plus any other days the action touched — a
 * check-in that puts a repair step on tomorrow. The event row is written
 * only after the plan update has landed.
 *
 * The revision moves only when blocks changed (the reducer says so with
 * `structural`): a start, a completion, a skip or a plain check-in keeps
 * it, so the page a student comes back to after "Start focus block" is not
 * stale before their first tap.
 */

const ACTIONS: ReadonlySet<TaskAction> = new Set(['start', 'complete', 'shorten', 'skip', 'defer', 'carry', 'swap', 'checkin', 'pin', 'unpin'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_REASON = 200
const MAX_MINUTES = 600

const EVENT_FOR_ACTION: Partial<Record<TaskAction, RoadmapEventType>> = {
  start: 'task_started',
  complete: 'task_completed',
  skip: 'task_skipped',
  swap: 'task_swapped',
  shorten: 'task_shortened',
  defer: 'task_deferred',
  carry: 'task_carried',
  checkin: 'task_checkin',
}

type ParsedTask = { req: TaskActionRequest; nowMinute?: number }

function parseBody(body: unknown): { ok: true; value: ParsedTask } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body.' }
  const b = body as Record<string, unknown>
  const taskId = typeof b.taskId === 'string' ? b.taskId.trim() : ''
  if (!taskId || taskId.length > 120) return { ok: false, error: 'Which task?' }
  const action = b.action
  if (typeof action !== 'string' || !ACTIONS.has(action as TaskAction)) return { ok: false, error: 'Unknown action.' }
  const revision = Number(b.revision)
  if (!Number.isInteger(revision) || revision < 0) return { ok: false, error: 'Expected the plan revision.' }

  const req: TaskActionRequest = { taskId, action: action as TaskAction, revision }
  if (b.actualMinutes !== undefined) {
    const n = Number(b.actualMinutes)
    if (!Number.isFinite(n) || n < 0 || n > MAX_MINUTES) return { ok: false, error: 'Minutes should be between 0 and 600.' }
    req.actualMinutes = Math.round(n)
  }
  if (b.minutes !== undefined) {
    const n = Number(b.minutes)
    if (!Number.isFinite(n) || n < 1 || n > MAX_MINUTES) return { ok: false, error: 'Minutes should be between 1 and 600.' }
    req.minutes = Math.round(n)
  }
  if (b.feel !== undefined) {
    if (typeof b.feel !== 'string' || !(b.feel in CHECKIN_FEEL_LABEL)) return { ok: false, error: 'Unknown check-in.' }
    req.feel = b.feel as CheckinFeel
  }
  if (b.reason !== undefined) {
    if (typeof b.reason !== 'string') return { ok: false, error: 'Reason should be text.' }
    req.reason = b.reason.trim().slice(0, MAX_REASON)
  }
  if (b.toDate !== undefined) {
    if (typeof b.toDate !== 'string' || !ISO_DATE.test(b.toDate)) return { ok: false, error: 'Which day?' }
    req.toDate = b.toDate
  }
  if (req.action === 'carry' && !req.toDate) return { ok: false, error: 'Which day?' }
  let nowMinute: number | undefined
  if (b.nowMinute !== undefined) {
    const n = Number(b.nowMinute)
    if (Number.isFinite(n) && n >= 0 && n < 1440) nowMinute = Math.floor(n)
  }
  return { ok: true, value: { req, nowMinute } }
}

type TaskWrite = RoadmapWrite & { date: string; diff?: ReplanDiff; changedDates: string[] }

export async function PATCH(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = parseBody(body)
  if (!parsed.ok) return jsonWithAuthCookies({ error: parsed.error }, pendingCookies, { status: 400 })
  const { req, nowMinute } = parsed.value

  const admin = createServiceClient()
  const now = new Date()
  const seen = { noopDate: null as string | null }
  try {
    const result = await mutateRoadmap<TaskWrite>(
      admin,
      user.id,
      now,
      async (loaded, ctx) => {
        if (loaded.revision !== req.revision) throw new RoadmapStaleError(loaded.revision)
        const plan = normaliseRoadmap(loaded.plan)
        const before = dayOfTask(plan, req.taskId)
        if (!before) return null
        const task = taskById(plan, req.taskId)
        const res = applyTaskAction(plan, loaded.taskState, loaded.pools, req, ctx)
        if (res.noop) {
          seen.noopDate = before.date
          return null
        }
        const nextPlan = res.needsHydration.length > 0 ? await hydrateTasks(admin, res.plan, res.needsHydration) : res.plan
        const changedDates = res.changedDates ?? []
        const revision = res.structural ? loaded.revision + 1 : loaded.revision
        const done = doneAfterTasks(loaded, normaliseRoadmap(nextPlan), res.taskState, ctx.evidence, before.date)

        // The reducer says what happened (a shorten's actual minutes are the
        // new length; pin and unpin record nothing); the action map is the
        // fallback for an action it did not describe.
        const events: RoadmapEventInput[] = []
        const eventType: RoadmapEventType | undefined = res.event?.type ?? EVENT_FOR_ACTION[req.action]
        const rowFor = (type: RoadmapEventType, ev: typeof res.event): RoadmapEventInput => ({
          eventType: type,
          taskId: req.taskId,
          subjectCode: task?.subjectCode ?? null,
          topicCode: task?.topic?.code ?? null,
          taskType: task?.taskType ?? null,
          planGeneratedAt: loaded.generatedAt,
          plannedMinutes: ev?.plannedMinutes ?? task?.minutes ?? null,
          actualMinutes: ev?.actualMinutes ?? req.actualMinutes ?? null,
          feel: ev?.feel ?? req.feel ?? null,
          reason: ev?.reason ?? req.reason ?? null,
          revision,
          meta: { action: req.action, minutes: req.minutes ?? null, changed: changedDates.length, ...(ev?.meta ?? {}) },
        })
        if (eventType) events.push(rowFor(eventType, res.event))
        for (const extra of res.extraEvents ?? []) events.push(rowFor(extra.type, extra))
        return {
          plan: nextPlan,
          taskState: res.taskState,
          done,
          pools: res.pools !== loaded.pools ? res.pools : undefined,
          // The snapshot covers every date the change reached, so a defer's copy goes with the undo.
          undo: res.diff && res.diff.changes.length > 0 ? undoSnapshotFor(plan, loaded.taskState, res.diff.date, res.diff.summary, changedDates) : undefined,
          revision,
          events,
          date: before.date,
          diff: res.diff,
          changedDates,
        }
      },
      { nowMinute }
    )
    if (!result) return jsonWithAuthCookies({ error: 'No plan yet.' }, pendingCookies, { status: 404 })
    if (!result.write) {
      // A repeat of a terminal action, or a task that is not on the plan.
      if (!seen.noopDate) return jsonWithAuthCookies({ error: 'No such task.' }, pendingCookies, { status: 404 })
      const current = dayMutationResponse(result.after, seen.noopDate, undefined)
      return jsonWithAuthCookies(current, pendingCookies)
    }
    const response = dayMutationResponse(result.after, result.write.date, result.write.diff, result.write.changedDates)
    if (!response) return jsonWithAuthCookies({ error: 'No such task.' }, pendingCookies, { status: 404 })
    return jsonWithAuthCookies(response, pendingCookies)
  } catch (err) {
    if (err instanceof RoadmapStaleError) {
      return jsonWithAuthCookies({ error: 'stale', revision: err.revision }, pendingCookies, { status: 409 })
    }
    if (err instanceof RoadmapConflictError) {
      return jsonWithAuthCookies({ error: 'conflict' }, pendingCookies, { status: 409 })
    }
    console.error('[plan] task action failed', err)
    return jsonWithAuthCookies({ error: "That didn't save. Try again in a moment." }, pendingCookies, { status: 500 })
  }
}
