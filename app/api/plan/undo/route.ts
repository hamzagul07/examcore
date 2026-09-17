import { NextRequest } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'
import {
  RoadmapConflictError,
  RoadmapStaleError,
  dayMutationResponse,
  hydrateTasks,
  mutateRoadmap,
  type RoadmapWrite,
} from '@/lib/plan/study-plan-service'
import { applyUndo, undoDates } from '@/lib/plan/task-actions'
import { normaliseRoadmap } from '@/lib/plan/roadmap-view'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/plan/undo — put the one stored snapshot back. Single-level:
 * the snapshot is cleared once used, the revision moves on, and the
 * response is the day it was shown for plus any other day it restored
 * (DayMutationResponse). The body's `revision`, when given, must be the
 * current one — a stale tab may not undo over changes made elsewhere.
 */

type UndoWrite = RoadmapWrite & { date: string; dates: string[] }

export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  let expected: number | null = null
  try {
    const body = (await request.json().catch(() => ({}))) as { revision?: unknown }
    const n = Number(body?.revision)
    if (body?.revision !== undefined && Number.isInteger(n) && n >= 0) expected = n
  } catch {
    expected = null
  }

  const admin = createServiceClient()
  try {
    const result = await mutateRoadmap<UndoWrite>(admin, user.id, new Date(), async (loaded) => {
      if (expected !== null && expected !== loaded.revision) throw new RoadmapStaleError(loaded.revision)
      const snap = loaded.undo
      if (!snap) return null
      const plan = normaliseRoadmap(loaded.plan)
      const res = applyUndo(plan, loaded.taskState, snap)
      const nextPlan = res.needsHydration.length > 0 ? await hydrateTasks(admin, res.plan, res.needsHydration) : res.plan
      const revision = loaded.revision + 1
      return {
        plan: nextPlan,
        taskState: res.taskState,
        undo: null,
        revision,
        events: [
          {
            eventType: 'roadmap_undo',
            planGeneratedAt: loaded.generatedAt,
            revision,
            meta: { date: snap.date, undoneRevision: snap.revision },
          },
        ],
        date: snap.date,
        dates: undoDates(snap),
      }
    })
    if (!result) return jsonWithAuthCookies({ error: 'No plan yet.' }, pendingCookies, { status: 404 })
    if (!result.write) return jsonWithAuthCookies({ error: 'Nothing to undo.' }, pendingCookies, { status: 404 })
    const response = dayMutationResponse(result.after, result.write.date, undefined, result.write.dates)
    if (!response) return jsonWithAuthCookies({ error: 'No such plan day.' }, pendingCookies, { status: 404 })
    return jsonWithAuthCookies(response, pendingCookies)
  } catch (err) {
    if (err instanceof RoadmapStaleError) {
      return jsonWithAuthCookies({ error: 'stale', revision: err.revision }, pendingCookies, { status: 409 })
    }
    if (err instanceof RoadmapConflictError) {
      return jsonWithAuthCookies({ error: 'conflict' }, pendingCookies, { status: 409 })
    }
    console.error('[plan] undo failed', err)
    return jsonWithAuthCookies({ error: "That didn't save. Try again in a moment." }, pendingCookies, { status: 500 })
  }
}
