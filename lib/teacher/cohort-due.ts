/**
 * Cohort due list — which topics are cooling off across a classroom.
 *
 * Aggregates per-student review_schedule / lesson_recall rows into topic-level
 * counts a teacher can act on. Pure so ranking rules are testable without DB.
 */

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
