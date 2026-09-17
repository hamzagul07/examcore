/**
 * The roadmap's client fetch layer.
 *
 * Every screen that talks to /api/plan/* goes through here, for three
 * reasons that are easy to get wrong one call at a time:
 *
 *   Revisions. Task, replan and undo calls carry the revision the client is
 *   looking at and get a 409 { error: 'stale' } when another tab (or the
 *   lazy rollover) moved it on. The right response is not an error toast: it
 *   is to fetch the plan again, adopt it, and replay the action once with
 *   the new revision. Once, because a second 409 means something else is
 *   wrong and the student should see the fresh plan rather than a loop.
 *
 *   Offline. A student ticks a task on the train and the request fails. The
 *   tick must not vanish, and the sheet must not pretend it saved. Failed
 *   mutations go into a localStorage queue and are replayed when the browser
 *   says it is online again, or on the next mount; the copy says "Saved on
 *   this device — will sync" until then.
 *
 *   Days, not plans. Mutations return one day (DayMutationResponse) and the
 *   client splices it into local state by date. spliceDays is pure so that
 *   rule is tested rather than trusted.
 *
 * The today summary (GET /api/plan/today) is what the Study Mode chip and
 * the /mark card read. It is fetched only when the auth cookie is present —
 * a signed-out visitor never pays for a 401 — and cached per date for ten
 * minutes in sessionStorage so the chip costs nothing on each lesson.
 */

import type { DoneDays, HydratedDay, HydratedPlan } from '@/lib/plan/plan-view'
import type {
  DayMutationResponse,
  ReplanRequest,
  RoadmapTodaySummary,
  TaskActionRequest,
  TaskState,
} from '@/lib/plan/roadmap-types'

export type PlanPayload = {
  plan: HydratedPlan | null
  done: DoneDays
  taskState: TaskState
  revision: number
  evidence: string[]
  /** Whether the server holds an undo point for the last replan, rollover or check-in effect. */
  canUndo: boolean
}

export type DayMutation = DayMutationResponse<HydratedDay>

export type MutationOutcome =
  | { kind: 'ok'; data: DayMutation; refreshed?: PlanPayload }
  | { kind: 'queued' }
  | { kind: 'stale'; refreshed: PlanPayload | null }
  | { kind: 'error'; message: string }

const GENERIC_ERROR = "That didn't save. Try again in a moment."

// --- reading -----------------------------------------------------------------------

export async function fetchPlan(): Promise<PlanPayload | null> {
  try {
    const res = await fetch('/api/plan', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<PlanPayload>
    return {
      plan: data.plan ?? null,
      done: data.done ?? {},
      taskState: data.taskState ?? {},
      revision: typeof data.revision === 'number' ? data.revision : (data.plan?.revision ?? 1),
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
      canUndo: data.canUndo === true,
    }
  } catch {
    return null
  }
}

// --- splicing ------------------------------------------------------------------------

/**
 * Replace days by date; a date the plan did not have is inserted in order.
 * Never reorders what it does not touch, so React keys stay stable.
 */
export function spliceDays<D extends { date: string }>(days: readonly D[], incoming: readonly D[]): D[] {
  if (incoming.length === 0) return [...days]
  const byDate = new Map(incoming.map((d) => [d.date, d]))
  const out: D[] = days.map((d) => byDate.get(d.date) ?? d)
  const known = new Set(days.map((d) => d.date))
  for (const d of incoming) {
    if (known.has(d.date)) continue
    const at = out.findIndex((x) => x.date > d.date)
    if (at === -1) out.push(d)
    else out.splice(at, 0, d)
  }
  return out
}

/** All the days a mutation touched: the one it was for, and any side effects on other dates. */
export function mutationDays<Day extends { date: string }>(m: DayMutationResponse<Day>): Day[] {
  return [m.day, ...(m.otherDays ?? []).map((o) => o.day)]
}

// --- mutations -------------------------------------------------------------------------

type Sent =
  | { status: 'ok'; data: DayMutation }
  | { status: 'stale' }
  | { status: 'network' }
  | { status: 'error'; message: string }

async function send(path: string, body: unknown): Promise<Sent> {
  let res: Response
  try {
    res = await fetch(path, {
      method: path.endsWith('/task') ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // A 'start' fires as the student leaves for /mark; the request must outlive the page.
      keepalive: true,
    })
  } catch {
    return { status: 'network' }
  }
  const data = (await res.json().catch(() => ({}))) as Partial<DayMutation> & { error?: string }
  if (res.status === 409) return { status: 'stale' }
  if (!res.ok || !data.day) return { status: 'error', message: data.error || GENERIC_ERROR }
  return { status: 'ok', data: data as DayMutation }
}

/**
 * Send once; on 409 fetch the plan, adopt its revision and send once more.
 * A network failure queues the request instead of failing it.
 */
async function sendWithReplay(
  path: string,
  body: { revision: number },
  queueItem: QueueItem | null,
  kv: KV | null = storage()
): Promise<MutationOutcome> {
  const first = await send(path, body)
  if (first.status === 'ok') return { kind: 'ok', data: first.data }
  if (first.status === 'network') {
    if (queueItem && kv) enqueue(queueItem, kv)
    return { kind: 'queued' }
  }
  if (first.status === 'error') return { kind: 'error', message: first.message }

  const refreshed = await fetchPlan()
  if (!refreshed?.plan) return { kind: 'stale', refreshed }
  const second = await send(path, { ...body, revision: refreshed.revision })
  if (second.status === 'ok') return { kind: 'ok', data: second.data, refreshed }
  if (second.status === 'network') {
    if (queueItem && kv) enqueue({ ...queueItem, body: { ...queueItem.body, revision: refreshed.revision } }, kv)
    return { kind: 'queued' }
  }
  if (second.status === 'stale') return { kind: 'stale', refreshed }
  return { kind: 'error', message: second.message }
}

/** PATCH /api/plan/task. nowMinute rides along so the server's "rest of today" is the student's. */
export function taskAction(req: TaskActionRequest, nowMinute: number): Promise<MutationOutcome> {
  const body = { ...req, nowMinute }
  return sendWithReplay('/api/plan/task', body, { id: newId(), kind: 'task', body, at: new Date().toISOString() })
}

/** POST /api/plan/replan. */
export function replanToday(req: ReplanRequest): Promise<MutationOutcome> {
  return sendWithReplay('/api/plan/replan', req, { id: newId(), kind: 'replan', body: req, at: new Date().toISOString() })
}

/** POST /api/plan/undo. Never queued: an undo of something that has not synced makes no sense. */
export function undoLast(revision: number): Promise<MutationOutcome> {
  return sendWithReplay('/api/plan/undo', { revision }, null)
}

// --- the retry queue ---------------------------------------------------------------------

export const QUEUE_KEY = 'ms-roadmap-queue'

export type KV = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type QueueItem = {
  id: string
  kind: 'task' | 'replan'
  body: (TaskActionRequest & { nowMinute: number }) | ReplanRequest
  at: string
}

function storage(): KV | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

export function readQueue(kv: KV | null = storage()): QueueItem[] {
  if (!kv) return []
  try {
    const raw = kv.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is QueueItem =>
        Boolean(x) && typeof x === 'object' && typeof (x as QueueItem).id === 'string' && Boolean((x as QueueItem).body)
    )
  } catch {
    return []
  }
}

export function writeQueue(items: QueueItem[], kv: KV | null = storage()): void {
  if (!kv) return
  try {
    if (items.length === 0) kv.removeItem(QUEUE_KEY)
    else kv.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch {
    /* storage full or blocked: the request is simply lost, as it would have been */
  }
}

export function enqueue(item: QueueItem, kv: KV | null = storage()): void {
  const items = readQueue(kv)
  // The same task ticked twice offline is one tick.
  const dupe = items.some(
    (q) => q.kind === item.kind && JSON.stringify({ ...q.body, revision: 0 }) === JSON.stringify({ ...item.body, revision: 0 })
  )
  if (dupe) return
  writeQueue([...items, item], kv)
}

export function queuedCount(kv: KV | null = storage()): number {
  return readQueue(kv).length
}

/**
 * Replay the queue in order. Stops at the first network failure (still
 * offline) and leaves the rest for next time; a server error drops that
 * item so one bad request cannot block the queue forever.
 */
export async function flushQueue(
  onOutcome: (item: QueueItem, outcome: MutationOutcome) => void,
  kv: KV | null = storage()
): Promise<void> {
  const items = readQueue(kv)
  if (items.length === 0) return
  const remaining = [...items]
  for (const item of items) {
    const path = item.kind === 'task' ? '/api/plan/task' : '/api/plan/replan'
    const outcome = await sendWithReplay(path, item.body, null, kv)
    if (outcome.kind === 'queued') break
    remaining.shift()
    writeQueue(remaining, kv)
    onOutcome(item, outcome)
  }
}

/** What the screen does with a replayed queue item: adopt any refreshed plan, then splice the day in. */
export function applyQueueOutcome(
  outcome: MutationOutcome,
  applyPayload: (p: PlanPayload) => void,
  applyMutation: (m: DayMutation) => void
): void {
  if (outcome.kind === 'ok') {
    if (outcome.refreshed) applyPayload(outcome.refreshed)
    applyMutation(outcome.data)
    return
  }
  if (outcome.kind === 'stale' && outcome.refreshed) applyPayload(outcome.refreshed)
}

// --- today summary -----------------------------------------------------------------------

export const TODAY_CACHE_PREFIX = 'ms-roadmap-today:'
export const TODAY_CACHE_TTL_MS = 10 * 60 * 1000

/** The cheap signed-in hint the lesson page already uses; a 401 is never worth a request. */
export function hasAuthCookie(): boolean {
  try {
    return typeof document !== 'undefined' && document.cookie.includes('auth-token')
  } catch {
    return false
  }
}

function localDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function session(): KV | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function readTodayCache(kv: KV | null = session(), now = new Date()): RoadmapTodaySummary | null {
  if (!kv) return null
  try {
    const raw = kv.getItem(TODAY_CACHE_PREFIX + localDateKey(now))
    if (!raw) return null
    const entry = JSON.parse(raw) as { at: number; summary: RoadmapTodaySummary }
    if (!entry || typeof entry.at !== 'number' || now.getTime() - entry.at > TODAY_CACHE_TTL_MS) return null
    return entry.summary
  } catch {
    return null
  }
}

export function writeTodayCache(summary: RoadmapTodaySummary, kv: KV | null = session(), now = new Date()): void {
  if (!kv) return
  try {
    kv.setItem(TODAY_CACHE_PREFIX + localDateKey(now), JSON.stringify({ at: now.getTime(), summary }))
  } catch {
    /* ignore */
  }
}

/** After any mutation the chip's cached "next task" is wrong; drop it. */
export function clearTodayCache(kv: KV | null = session(), now = new Date()): void {
  if (!kv) return
  try {
    kv.removeItem(TODAY_CACHE_PREFIX + localDateKey(now))
  } catch {
    /* ignore */
  }
}

/**
 * The summary for the chip and the /mark card. Null when signed out, when
 * there is no plan, or when anything at all went wrong: these surfaces
 * render nothing rather than an error.
 */
export async function fetchTodaySummary(): Promise<RoadmapTodaySummary | null> {
  if (!hasAuthCookie()) return null
  const cached = readTodayCache()
  if (cached) return cached.hasPlan ? cached : null
  try {
    const res = await fetch('/api/plan/today', { cache: 'no-store' })
    if (res.status === 401 || res.status === 404) return null
    if (!res.ok) return null
    const summary = (await res.json()) as RoadmapTodaySummary
    if (!summary || typeof summary.hasPlan !== 'boolean') return null
    // Only a real summary is cached: a "no plan" answer must not hide the chip for ten minutes after the roadmap is built.
    if (summary.hasPlan) writeTodayCache(summary)
    return summary.hasPlan ? summary : null
  } catch {
    return null
  }
}
