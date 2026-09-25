/**
 * Cohort due list — which topics are cooling off across a classroom.
 *
 * Aggregates per-student review_schedule / lesson_recall rows into topic-level
 * counts a teacher can act on. Pure so ranking rules are testable without DB;
 * lib/teacher/load-due-rows.ts reads the tables and hands the rows to
 * `dueRowsFromTables`.
 *
 * Classroom scope applies here as it does to attempts (spec §8): a teacher
 * sees due topics in the classroom's subject only, and only for topics the
 * student worked on since joining — a schedule row last touched before they
 * joined describes work the class was never shown.
 */

import { selectDueRecall, type RecallRow } from '@/lib/courses/recall-schedule'
import { getSubjectByCode } from '@/lib/profile-options'
import { getSyllabusTopicByCode } from '@/lib/syllabi'

export type CohortDueSource = 'attempts' | 'recall' | 'both'

export type StudentDueTopic = {
  subjectCode: string
  topicCode: string
  name: string
  subjectLabel: string
  source: 'attempts' | 'recall'
  dueAt: string
}

export type CohortDueRow = {
  userId: string
  subjectCode: string
  topicCode: string
  source: 'attempts' | 'recall'
  dueAt: string
}

export type CohortDueTopic = {
  subjectCode: string
  topicCode: string
  name: string
  subjectLabel: string
  studentsDue: number
  totalStudents: number
  /** Share of the roster due on this topic, 0–100. */
  duePct: number
  source: CohortDueSource
  /** Sample first names for the row meta (max 3). */
  sampleNames: string[]
}

export type CohortDueInput = {
  totalStudents: number
  rows: CohortDueRow[]
  /** userId → display name */
  names: Record<string, string>
  /** `${subject}::${topic}` → human topic name */
  topicNames?: Record<string, string>
  /** subjectCode → label */
  subjectLabels?: Record<string, string>
  limit?: number
}

function keyOf(subject: string, topic: string): string {
  return `${subject}::${topic}`
}

/** A `review_schedule` row (attempt-driven spaced review). */
export type ScheduleTableRow = {
  user_id: string
  subject_code: string
  topic_code: string
  due_at: string
  last_reviewed_at: string | null
}

/** A `lesson_recall` row (a completed lesson quick check coming back). */
export type RecallTableRow = RecallRow & { user_id: string }

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/**
 * Due rows from the two schedule tables, scoped to a classroom.
 *
 *   - Only rows due by `nowMs`.
 *   - `subjectCode`: only that subject (null/undefined: every subject).
 *   - `joinedAt` (student → ISO join time): only students in the map, and only
 *     topics last worked on or after that time. A row with no readable
 *     last-activity time is dropped — the rule fails closed.
 *   - A recall item is dropped for any topic the student has a schedule row
 *     for — due or not, in scope or not — because a schedule row means they
 *     have been marked on it, and marked work is strictly stronger evidence
 *     than a self-assessed quick check (as in the student's own queue). So
 *     pass every schedule row, not only due ones.
 *   - A student with two lessons on the same topic yields one row, with the
 *     earlier due date.
 */
export function dueRowsFromTables(input: {
  schedule: readonly ScheduleTableRow[]
  recall: readonly RecallTableRow[]
  nowMs: number
  subjectCode?: string | null
  joinedAt?: ReadonlyMap<string, string>
}): CohortDueRow[] {
  const { nowMs, subjectCode, joinedAt } = input

  function inScope(userId: string, subject: string, lastActivity: string | null): boolean {
    if (!userId || !subject) return false
    if (subjectCode && subject !== subjectCode) return false
    if (!joinedAt) return true
    const joined = toMs(joinedAt.get(userId))
    const last = toMs(lastActivity)
    return joined !== null && last !== null && last >= joined
  }

  const byKey = new Map<string, CohortDueRow>()
  const keep = (row: CohortDueRow) => {
    const k = `${row.userId}::${keyOf(row.subjectCode, row.topicCode)}`
    const held = byKey.get(k)
    if (!held || Date.parse(row.dueAt) < Date.parse(held.dueAt)) byKey.set(k, row)
  }

  // Every topic with marked work, whatever its due date or scope.
  const marked = new Set(
    input.schedule.map((r) => `${r.user_id}::${keyOf(r.subject_code, r.topic_code)}`)
  )

  for (const r of input.schedule) {
    if (!r.topic_code) continue
    const due = toMs(r.due_at)
    if (due === null || due > nowMs) continue
    if (!inScope(r.user_id, r.subject_code, r.last_reviewed_at)) continue
    keep({
      userId: r.user_id,
      subjectCode: r.subject_code,
      topicCode: r.topic_code,
      source: 'attempts',
      dueAt: r.due_at,
    })
  }

  const recallByUser = new Map<string, RecallTableRow[]>()
  for (const r of input.recall) {
    if (!inScope(r.user_id, r.subject_code, r.last_worked_at)) continue
    const list = recallByUser.get(r.user_id)
    if (list) list.push(r)
    else recallByUser.set(r.user_id, [r])
  }
  for (const [userId, rows] of recallByUser) {
    for (const d of selectDueRecall(rows, new Set(), nowMs)) {
      if (!d.topicCode) continue
      const k = `${userId}::${keyOf(d.subjectCode, d.topicCode)}`
      if (marked.has(k)) continue
      // Matched on subject AND lesson: two subjects can share a topic code
      // ("1.1"), and the due date must come from this lesson's own row.
      const own = rows.find((x) => x.subject_code === d.subjectCode && x.lesson_slug === d.lessonSlug)
      if (!own) continue
      keep({
        userId,
        subjectCode: d.subjectCode,
        topicCode: d.topicCode,
        source: 'recall',
        dueAt: own.due_at,
      })
    }
  }

  return [...byKey.values()]
}

/**
 * Collapse student-level due rows into ranked topics.
 *
 * Sort: most students due first, then topic code for stability.
 * Dedupes a student who appears on both schedule + recall for the same topic.
 */
export function buildCohortDueList(input: CohortDueInput): CohortDueTopic[] {
  const { totalStudents, rows, names, topicNames = {}, subjectLabels = {} } = input
  const limit = input.limit ?? 8
  if (totalStudents <= 0 || rows.length === 0) return []

  type Acc = {
    subjectCode: string
    topicCode: string
    userIds: Set<string>
    sources: Set<'attempts' | 'recall'>
  }
  const byTopic = new Map<string, Acc>()

  for (const r of rows) {
    if (!r.userId || !r.subjectCode || !r.topicCode) continue
    const k = keyOf(r.subjectCode, r.topicCode)
    let acc = byTopic.get(k)
    if (!acc) {
      acc = {
        subjectCode: r.subjectCode,
        topicCode: r.topicCode,
        userIds: new Set(),
        sources: new Set(),
      }
      byTopic.set(k, acc)
    }
    acc.userIds.add(r.userId)
    acc.sources.add(r.source)
  }

  const out: CohortDueTopic[] = []
  for (const acc of byTopic.values()) {
    const studentsDue = acc.userIds.size
    if (studentsDue === 0) continue
    const sampleNames = [...acc.userIds]
      .map((id) => names[id] || 'Student')
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 3)
    const source: CohortDueSource =
      acc.sources.has('attempts') && acc.sources.has('recall')
        ? 'both'
        : acc.sources.has('attempts')
          ? 'attempts'
          : 'recall'
    out.push({
      subjectCode: acc.subjectCode,
      topicCode: acc.topicCode,
      name: topicNames[keyOf(acc.subjectCode, acc.topicCode)] || acc.topicCode,
      subjectLabel: subjectLabels[acc.subjectCode] || acc.subjectCode,
      studentsDue,
      totalStudents,
      duePct: Math.round((studentsDue / totalStudents) * 100),
      source,
      sampleNames,
    })
  }

  return out
    .sort(
      (a, b) =>
        b.studentsDue - a.studentsDue ||
        a.subjectCode.localeCompare(b.subjectCode) ||
        a.topicCode.localeCompare(b.topicCode)
    )
    .slice(0, limit)
}

/**
 * Per-student unique due topic counts — for roster badges.
 * Dedupes (subject, topic) so attempt + recall on the same topic counts once.
 */
export function countDueByStudent(
  rows: CohortDueRow[]
): Record<string, number> {
  const topicsByUser = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!r.userId || !r.subjectCode || !r.topicCode) continue
    let set = topicsByUser.get(r.userId)
    if (!set) {
      set = new Set()
      topicsByUser.set(r.userId, set)
    }
    set.add(`${r.subjectCode}::${r.topicCode}`)
  }
  const out: Record<string, number> = {}
  for (const [uid, set] of topicsByUser) out[uid] = set.size
  return out
}

/** Label + sort a single student's due rows for the teacher profile. */
export function buildStudentDueTopics(
  rows: CohortDueRow[],
  limit = 10
): StudentDueTopic[] {
  const seen = new Set<string>()
  const out: StudentDueTopic[] = []

  const sorted = [...rows].sort((a, b) => {
    const src =
      (a.source === 'attempts' ? 0 : 1) - (b.source === 'attempts' ? 0 : 1)
    if (src !== 0) return src
    return Date.parse(a.dueAt) - Date.parse(b.dueAt)
  })

  for (const r of sorted) {
    const k = `${r.subjectCode}::${r.topicCode}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      subjectCode: r.subjectCode,
      topicCode: r.topicCode,
      name:
        getSyllabusTopicByCode(r.subjectCode, r.topicCode)?.name ?? r.topicCode,
      subjectLabel: getSubjectByCode(r.subjectCode)?.label ?? r.subjectCode,
      source: r.source,
      dueAt: r.dueAt,
    })
    if (out.length >= limit) break
  }

  return out
}
