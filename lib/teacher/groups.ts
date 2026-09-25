/**
 * Error groups — students who are losing marks the same way
 * (docs/TEACHER_SYSTEM_SPEC.md §2.4, §4 ErrorGroupsPanel).
 *
 * A blindspot says "the class is weak on integration". A group says "these
 * four students keep making conceptual errors on integration" or "these six
 * drop arithmetic marks whatever the topic" — a set of names a teacher can
 * pull aside or set one drill for ("Set a drill for this group" prefills the
 * composer with `student_ids`).
 *
 * Two kinds of group, because the two kinds of error need different help:
 *
 *   - Conceptual errors are about a topic — the student misunderstands it —
 *     so they are grouped per syllabus leaf (`leaf_code` set). A conceptual
 *     error on an attempt with no usable tag has no topic to act on and is
 *     left out rather than lumped into a vague "somewhere" group.
 *   - Slips (sign / algebra, arithmetic, unfinished working, time pressure)
 *     are habits that follow a student from topic to topic, so they are
 *     grouped across the whole subject (`leaf_code` null).
 *
 * Evidence is the marks themselves. `attempts.error_classifications` is used
 * when present; older rows without it fall back to the per-mark
 * `ai_marking.marks_awarded[].error_classification`. A mark a teacher has
 * since overridden to earned is not an error any more and is dropped. Pure.
 */

import { normalizeErrorClassification, type ErrorClassification } from '@/lib/error-classifications'
import { getSyllabusTopicByCode, getValidSyllabusCodes } from '@/lib/syllabi'
import type { ClassroomAttempt } from '@/lib/teacher-analytics'
import type { ErrorGroup } from '@/lib/teacher/types'

/** The attempt fields grouping reads; ClassroomAttempt satisfies it. */
export type GroupAttempt = Pick<
  ClassroomAttempt,
  'user_id' | 'syllabus_tags' | 'error_classifications' | 'ai_marking'
>

type ErrorKind = Exclude<ErrorClassification, 'no_error'>

/** Errors that belong to a topic; everything else is a cross-topic habit. */
const TOPIC_BOUND: ReadonlySet<ErrorKind> = new Set<ErrorKind>(['conceptual'])

/** Plural, teacher-facing names for a group of students. */
const GROUP_NOUN: Record<ErrorKind, string> = {
  conceptual: 'Conceptual errors',
  algebraic_sign: 'Sign and algebra slips',
  arithmetic: 'Arithmetic slips',
  incomplete: 'Unfinished working',
  time_pressure: 'Rushed under time pressure',
}

/** Topic-bound groups lead: a misunderstanding is the bigger teaching job. */
const KIND_ORDER: Record<ErrorKind, number> = {
  conceptual: 0,
  algebraic_sign: 1,
  arithmetic: 2,
  incomplete: 3,
  time_pressure: 4,
}

function markKey(id: unknown): string | null {
  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  if (typeof id === 'string' && id.trim()) return id.trim()
  return null
}

/** The lost marks of one attempt, as error kinds (one entry per lost mark). */
export function attemptErrors(a: GroupAttempt): ErrorKind[] {
  const points = a.ai_marking?.marks_awarded ?? null
  // Marks now counted as earned — by the marker or by a teacher's override.
  const earned = new Set<string>()
  if (points) {
    for (const p of points) {
      const key = markKey(p.mark_id)
      if (key && p.earned === true) earned.add(key)
    }
  }

  const out: ErrorKind[] = []
  const details = a.error_classifications
  if (Array.isArray(details) && details.length > 0) {
    for (const d of details) {
      const kind = normalizeErrorClassification(d?.classification)
      if (kind === 'no_error') continue
      const key = markKey(d?.mark_id)
      if (key && earned.has(key)) continue
      out.push(kind)
    }
    return out
  }

  if (points) {
    for (const p of points) {
      if (p.earned === true) continue
      const kind = normalizeErrorClassification(p.error_classification)
      if (kind !== 'no_error') out.push(kind)
    }
  }
  return out
}

function leafLabel(subjectCode: string, leaf: string): string {
  const name = getSyllabusTopicByCode(subjectCode, leaf)?.name
  return name ? `${name} (${leaf})` : leaf
}

/**
 * Groups of at least `minStudents` distinct students, largest first.
 *
 * `evidence_count` is the number of lost marks behind the group. `key` is
 * stable across calls (`conceptual:3.4`, `arithmetic:*`) so a UI can keep
 * a panel open across refreshes. `student_ids` are sorted.
 */
export function buildErrorGroups(
  attempts: readonly GroupAttempt[],
  subjectCode: string,
  minStudents = 2
): ErrorGroup[] {
  const floor = Number.isFinite(minStudents) ? Math.max(1, Math.floor(minStudents)) : 2
  const validLeaves = new Set(subjectCode ? getValidSyllabusCodes(subjectCode) : [])

  type Acc = { kind: ErrorKind; leaf: string | null; students: Set<string>; evidence: number }
  const groups = new Map<string, Acc>()
  const add = (kind: ErrorKind, leaf: string | null, student: string, count: number) => {
    const key = `${kind}:${leaf ?? '*'}`
    const acc = groups.get(key) ?? { kind, leaf, students: new Set<string>(), evidence: 0 }
    acc.students.add(student)
    acc.evidence += count
    groups.set(key, acc)
  }

  for (const a of attempts) {
    if (!a.user_id) continue
    const errors = attemptErrors(a)
    if (errors.length === 0) continue
    const counts = new Map<ErrorKind, number>()
    for (const e of errors) counts.set(e, (counts.get(e) ?? 0) + 1)
    const leaves = [...new Set((a.syllabus_tags ?? []).filter((t) => validLeaves.has(t)))]

    for (const [kind, count] of counts) {
      if (TOPIC_BOUND.has(kind)) {
        for (const leaf of leaves) add(kind, leaf, a.user_id, count)
      } else {
        add(kind, null, a.user_id, count)
      }
    }
  }

  return [...groups.entries()]
    .filter(([, g]) => g.students.size >= floor)
    .map(([key, g]) => ({
      key,
      label: g.leaf
        ? `${GROUP_NOUN[g.kind]} in ${leafLabel(subjectCode, g.leaf)}`
        : `${GROUP_NOUN[g.kind]} across topics`,
      classification: g.kind,
      leaf_code: g.leaf,
      student_ids: [...g.students].sort(),
      evidence_count: g.evidence,
    }))
    .sort(
      (a, b) =>
        b.student_ids.length - a.student_ids.length ||
        b.evidence_count - a.evidence_count ||
        KIND_ORDER[a.classification as ErrorKind] - KIND_ORDER[b.classification as ErrorKind] ||
        a.key.localeCompare(b.key, undefined, { numeric: true })
    )
}
