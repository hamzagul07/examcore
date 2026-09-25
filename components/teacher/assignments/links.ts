/**
 * Where the class pages link to (docs/TEACHER_SYSTEM_SPEC.md §4). One place
 * builds every href, so a card that prefills the composer
 * (`?source=&codes=&students=`) and the composer that reads it agree on the
 * format, and ids are always encoded.
 *
 * Pure; safe on client and server.
 */

import type { AssignmentSource } from '@/lib/teacher/types'

/** Topic codes carried in a composer link: a drill of more would exceed the 12-question cap anyway. */
export const PREFILL_MAX_CODES = 6
/**
 * Students carried in a composer link. Thirty-six characters each, so 150 is
 * a ~5.5 KB URL — inside every proxy's limit. A bigger group is the whole
 * class in practice; the link then prefills no one and the teacher picks.
 */
export const PREFILL_MAX_STUDENTS = 150

const enc = encodeURIComponent

export function classHref(classroomId: string, week?: string | null): string {
  const base = `/teacher/classroom/${enc(classroomId)}`
  return week ? `${base}?week=${enc(week)}` : base
}

export function setsHref(classroomId: string, status?: 'open' | 'closed' | 'draft'): string {
  const base = `/teacher/classroom/${enc(classroomId)}/assignments`
  return status && status !== 'open' ? `${base}?status=${status}` : base
}

export function setHref(classroomId: string, assignmentId: string): string {
  return `/teacher/classroom/${enc(classroomId)}/assignments/${enc(assignmentId)}`
}

/** The composer, reopened on a saved draft. */
export function editDraftHref(classroomId: string, assignmentId: string): string {
  return `/teacher/classroom/${enc(classroomId)}/assignments/new?draft=${enc(assignmentId)}`
}

export function printHref(classroomId: string, assignmentId: string): string {
  return `${setHref(classroomId, assignmentId)}/print`
}

export function studentHref(classroomId: string, studentId: string): string {
  return `/teacher/classroom/${enc(classroomId)}/students/${enc(studentId)}`
}

/** One script in the review console. */
export function reviewHref(attemptId: string): string {
  return `/teacher/reviews/${enc(attemptId)}`
}

/** The review inbox filtered to this class (and set). */
export function reviewsHref(classroomId: string, assignmentId?: string): string {
  const params = new URLSearchParams({ classroom_id: classroomId })
  if (assignmentId) params.set('assignment_id', assignmentId)
  return `/teacher/reviews?${params.toString()}`
}

/** The class markbook CSV (desk-management's export route). */
export function exportHref(classroomId: string): string {
  return `/api/teacher/classroom/${enc(classroomId)}/export?scope=assignments`
}

export type ComposerPrefillLink = {
  source?: AssignmentSource
  codes?: readonly string[]
  students?: readonly string[]
  /** The error group's stable key ("conceptual:3.4"), kept as provenance. */
  group?: string | null
  /** The set a reteach card was drawn from. */
  set?: string | null
}

/**
 * The composer, prefilled (spec §4: ReteachCard "Set a drill" →
 * `?source=reteach&codes=`, ErrorGroupsPanel → `?source=error_group&students=`).
 * Codes and students are de-duplicated and capped (see the constants above).
 */
export function composerHref(classroomId: string, prefill: ComposerPrefillLink = {}): string {
  const base = `/teacher/classroom/${enc(classroomId)}/assignments/new`
  const params = new URLSearchParams()
  if (prefill.source && prefill.source !== 'manual') params.set('source', prefill.source)
  const codes = [...new Set((prefill.codes ?? []).map((c) => c.trim()).filter(Boolean))].slice(0, PREFILL_MAX_CODES)
  if (codes.length) params.set('codes', codes.join(','))
  const students = [...new Set((prefill.students ?? []).map((s) => s.trim()).filter(Boolean))]
  if (students.length > 0 && students.length <= PREFILL_MAX_STUDENTS) params.set('students', students.join(','))
  if (prefill.group) params.set('group', prefill.group)
  if (prefill.set) params.set('set', prefill.set)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}
