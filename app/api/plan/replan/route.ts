import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  RoadmapConflictError,
  RoadmapStaleError,
  dayMutationResponse,
  hydrateTasks,
  mutateRoadmap,
  type RoadmapWrite,
} from '@/lib/plan/study-plan-service'
import { replanToday, undoSnapshotFor } from '@/lib/plan/task-actions'
import { normaliseRoadmap } from '@/lib/plan/roadmap-view'
import type { ReplanDiff, ReplanRequest } from '@/lib/plan/roadmap-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/plan/replan — rebuild the rest of today from the plan's own
 * topic pools (ReplanRequest). Done, pinned and started tasks are
 * protected; the response is the day with a diff the student can read and
 * undo. The date must be the plan's today in its own zone (409 otherwise):
 * a tab left open overnight is not allowed to replan yesterday.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseBody(body: unknown): { ok: true; value: ReplanRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body.' }
  const b = body as Record<string, unknown>
  if (b.scope !== undefined && b.scope !== 'today') return { ok: false, error: 'Only today can be replanned.' }
  if (typeof b.date !== 'string' || !ISO_DATE.test(b.date)) return { ok: false, error: 'Which day?' }
  const nowMinute = Number(b.nowMinute)
  if (!Number.isFinite(nowMinute) || nowMinute < 0 || nowMinute >= 1440) return { ok: false, error: 'Expected the time of day.' }
  const revision = Number(b.revision)
  if (!Number.isInteger(revision) || revision < 0) return { ok: false, error: 'Expected the plan revision.' }
  const value: ReplanRequest = { scope: 'today', date: b.date, nowMinute: Math.floor(nowMinute), revision }
  if (b.minutesLeft !== undefined) {
    const n = Number(b.minutesLeft)
    if (!Number.isFinite(n) || n < 0 || n > 1440) return { ok: false, error: 'Minutes left should be between 0 and 1440.' }
    value.minutesLeft = Math.round(n)
  }
  return { ok: true, value }
}

type ReplanWrite = RoadmapWrite & { diff?: ReplanDiff; changedDates: string[] }

export async function POST(request: NextRequest) {
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
  const req = parsed.value

  const admin = createServiceClient()
  const seen = { wrongDay: null as string | null, declined: null as ReplanDiff | null }
  try {
    const result = await mutateRoadmap<ReplanWrite>(
      admin,
      user.id,
      new Date(),
      async (loaded, ctx) => {
        if (req.date !== ctx.todayIso) {
          seen.wrongDay = ctx.todayIso
          return null
        }
        if (loaded.revision !== req.revision) throw new RoadmapStaleError(loaded.revision)
        const plan = normaliseRoadmap(loaded.plan)
        const res = replanToday(plan, loaded.taskState, loaded.pools, {
          date: req.date,
          nowMinute: req.nowMinute,
          minutesLeft: req.minutesLeft,
          evidence: ctx.evidence,
        })
        if (res.noop) {
          // Nothing left to lay into: the reducer declined with a calm line, which the student reads instead of an empty day.
          seen.declined = res.diff
          return null
        }
        const nextPlan = res.needsHydration.length > 0 ? await hydrateTasks(admin, res.plan, res.needsHydration) : res.plan
        const revision = loaded.revision + 1
        return {
          plan: nextPlan,
          taskState: res.taskState,
          undo: res.diff ? undoSnapshotFor(plan, loaded.taskState, req.date, res.diff.summary, res.changedDates) : undefined,
          revision,
          events: [
            {
              eventType: 'roadmap_replanned',
              planGeneratedAt: loaded.generatedAt,
              revision,
              meta: { date: req.date, nowMinute: req.nowMinute, changes: res.diff?.changes.length ?? 0 },
            },
          ],
          diff: res.diff,
          changedDates: res.changedDates ?? [],
        }
      },
      { nowMinute: req.nowMinute }
    )
    if (!result) return jsonWithAuthCookies({ error: 'No plan yet.' }, pendingCookies, { status: 404 })
    if (seen.wrongDay) return jsonWithAuthCookies({ error: 'not_today', today: seen.wrongDay }, pendingCookies, { status: 409 })
    const response = dayMutationResponse(result.after, req.date, result.write?.diff ?? seen.declined ?? undefined, result.write?.changedDates ?? [])
    if (!response) return jsonWithAuthCookies({ error: 'No such plan day.' }, pendingCookies, { status: 404 })
    return jsonWithAuthCookies(response, pendingCookies)
  } catch (err) {
    if (err instanceof RoadmapStaleError) {
      return jsonWithAuthCookies({ error: 'stale', revision: err.revision }, pendingCookies, { status: 409 })
    }
    if (err instanceof RoadmapConflictError) {
      return jsonWithAuthCookies({ error: 'conflict' }, pendingCookies, { status: 409 })
    }
    console.error('[plan] replan failed', err)
    return jsonWithAuthCookies({ error: "That didn't save. Try again in a moment." }, pendingCookies, { status: 500 })
  }
}
