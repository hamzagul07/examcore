import 'server-only'

/**
 * The roadmap's event record: one study_plan_events row per task action,
 * replan, rollover and undo, with planned and actual minutes. Best-effort
 * by design — an event that fails to write must never fail the action the
 * student just took, so this module logs and returns.
 *
 * Rows are denormalised (subject, topic, task type, the plan's generatedAt)
 * so scripts/plan-report.ts can group without opening the plan JSON.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckinFeel, RoadmapEventType, TaskType } from '@/lib/plan/roadmap-types'

export type RoadmapEventInput = {
  eventType: RoadmapEventType
  taskId?: string | null
  subjectCode?: string | null
  topicCode?: string | null
  taskType?: TaskType | string | null
  planGeneratedAt?: string | null
  plannedMinutes?: number | null
  actualMinutes?: number | null
  feel?: CheckinFeel | string | null
  reason?: string | null
  revision?: number | null
  meta?: Record<string, unknown>
}

const REASON_MAX = 200

function intOrNull(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null
}

/** Insert one event. Never throws; returns whether the row landed. */
export async function recordRoadmapEvent(admin: SupabaseClient, userId: string, row: RoadmapEventInput): Promise<boolean> {
  try {
    const { error } = await admin.from('study_plan_events').insert({
      user_id: userId,
      task_id: row.taskId ?? null,
      event_type: row.eventType,
      subject_code: row.subjectCode ?? null,
      topic_code: row.topicCode ?? null,
      task_type: row.taskType ?? null,
      plan_generated_at: row.planGeneratedAt ?? null,
      planned_minutes: intOrNull(row.plannedMinutes),
      actual_minutes: intOrNull(row.actualMinutes),
      feel: row.feel ?? null,
      reason: row.reason ? String(row.reason).slice(0, REASON_MAX) : null,
      revision: intOrNull(row.revision),
      meta: row.meta ?? {},
    })
    if (error) {
      console.error('[plan] event insert failed', row.eventType, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[plan] event insert threw', row.eventType, err)
    return false
  }
}

/** Several events in one insert, same best-effort contract. */
export async function recordRoadmapEvents(admin: SupabaseClient, userId: string, rows: RoadmapEventInput[]): Promise<void> {
  for (const row of rows) await recordRoadmapEvent(admin, userId, row)
}
