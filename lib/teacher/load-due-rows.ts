import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { selectDueRecall, type RecallRow } from '@/lib/courses/recall-schedule'
import type { CohortDueRow } from '@/lib/teacher/cohort-due'

/**
 * Load due review_schedule + lesson_recall rows for a set of students.
 * Caller must already have verified teacher ownership of the classroom.
 * Service-role client required (tables have zero RLS policies).
 */
export async function loadDueRowsForStudents(
  service: SupabaseClient,
  studentIds: string[],
  nowMs = Date.now()
): Promise<{ rows: CohortDueRow[]; error: string | null }> {
  if (studentIds.length === 0) return { rows: [], error: null }

  const nowIso = new Date(nowMs).toISOString()

  const [schedRes, recallRes] = await Promise.all([
    service
      .from('review_schedule')
      .select('user_id, subject_code, topic_code, due_at')
      .in('user_id', studentIds)
      .lte('due_at', nowIso)
      .limit(2000),
    service
      .from('lesson_recall')
      .select(
        'user_id, subject_code, lesson_slug, topic_code, answered_count, total_count, due_at, last_worked_at'
      )
      .in('user_id', studentIds)
      .lte('due_at', nowIso)
      .limit(2000),
  ])

  if (schedRes.error) {
    return { rows: [], error: schedRes.error.message }
  }
  if (recallRes.error) {
    return { rows: [], error: recallRes.error.message }
  }

  const rows: CohortDueRow[] = []

  for (const r of schedRes.data ?? []) {
    rows.push({
      userId: r.user_id as string,
      subjectCode: r.subject_code as string,
      topicCode: r.topic_code as string,
      source: 'attempts',
      dueAt: r.due_at as string,
    })
  }

  const attemptKeys = new Set(
    rows.map((r) => `${r.userId}::${r.subjectCode}::${r.topicCode}`)
  )

  const recallByUser = new Map<string, RecallRow[]>()
  for (const r of recallRes.data ?? []) {
    const uid = r.user_id as string
    const list = recallByUser.get(uid) ?? []
    list.push({
      subject_code: r.subject_code as string,
      lesson_slug: r.lesson_slug as string,
      topic_code: r.topic_code as string,
      answered_count: r.answered_count as number,
      total_count: r.total_count as number,
      due_at: r.due_at as string,
      last_worked_at: r.last_worked_at as string,
    })
    recallByUser.set(uid, list)
  }

  for (const [uid, userRows] of recallByUser) {
    const due = selectDueRecall(userRows, new Set(), nowMs)
    for (const d of due) {
      const k = `${uid}::${d.subjectCode}::${d.topicCode}`
      if (attemptKeys.has(k)) continue
      rows.push({
        userId: uid,
        subjectCode: d.subjectCode,
        topicCode: d.topicCode,
        source: 'recall',
        dueAt:
          userRows.find((x) => x.topic_code === d.topicCode)?.due_at ?? nowIso,
      })
    }
  }

  return { rows, error: null }
}
