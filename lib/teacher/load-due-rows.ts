import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { chunk, fetchAllFiltered } from '@/lib/teacher-classroom-data'
import {
  dueRowsFromTables,
  type CohortDueRow,
  type RecallTableRow,
  type ScheduleTableRow,
} from '@/lib/teacher/cohort-due'

export type LoadDueRowsOptions = {
  /** The classroom's subject; null/omitted reads every subject. */
  subjectCode?: string | null
  /**
   * student id → ISO joined_at. When given, only those students' rows are
   * kept, and only for topics worked on since they joined (spec §8). Pass it
   * for every classroom read; omit it only for a student's own view.
   */
  joinedAt?: ReadonlyMap<string, string>
  nowMs?: number
}

/**
 * Due review_schedule + lesson_recall rows for a set of students.
 *
 * The caller must already have verified that the teacher owns the classroom
 * and that `studentIds` are its active members. Service-role client required:
 * both tables are RLS-enabled with no policies. Reads page through every row
 * (a class's due rows can pass PostgREST's silent 1,000-row cap), and a read
 * error is returned rather than a partial list.
 */
export async function loadDueRowsForStudents(
  service: SupabaseClient,
  studentIds: string[],
  opts: LoadDueRowsOptions = {}
): Promise<{ rows: CohortDueRow[]; error: string | null }> {
  const ids = [...new Set(studentIds.filter(Boolean))]
  if (ids.length === 0) return { rows: [], error: null }

  const nowMs = opts.nowMs ?? Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const subjectCode = opts.subjectCode ?? null

  const schedule: ScheduleTableRow[] = []
  const recall: RecallTableRow[] = []
  try {
    for (const part of chunk(ids)) {
      const [schedRes, recallRes] = await Promise.all([
        fetchAllFiltered<ScheduleTableRow>('review_schedule', (from, to) => {
          let q = service
            .from('review_schedule')
            .select('user_id, subject_code, topic_code, due_at, last_reviewed_at')
            .in('user_id', part)
          // Not only due rows: one that is not due yet still suppresses the
          // same topic's recall item (see dueRowsFromTables).
          if (subjectCode) q = q.eq('subject_code', subjectCode)
          return q.order('user_id').order('subject_code').order('topic_code').range(from, to)
        }),
        fetchAllFiltered<RecallTableRow>('lesson_recall', (from, to) => {
          let q = service
            .from('lesson_recall')
            .select(
              'user_id, subject_code, lesson_slug, topic_code, answered_count, total_count, due_at, last_worked_at'
            )
            .in('user_id', part)
            .lte('due_at', nowIso)
          if (subjectCode) q = q.eq('subject_code', subjectCode)
          return q.order('user_id').order('subject_code').order('lesson_slug').range(from, to)
        }),
      ])
      schedule.push(...schedRes.rows)
      recall.push(...recallRes.rows)
    }
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) }
  }

  return {
    rows: dueRowsFromTables({ schedule, recall, nowMs, subjectCode, joinedAt: opts.joinedAt }),
    error: null,
  }
}
