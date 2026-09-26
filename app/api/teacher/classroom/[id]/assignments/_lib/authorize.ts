import 'server-only'

import { after, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { AssignmentInputError, ASSIGNMENT_COLUMNS, toAssignment } from '@/lib/teacher/assignments'
import { isUuid, loadTeacherClassroom, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import type { Assignment } from '@/lib/teacher/types'

/**
 * The route shape every `T/assignments/**` handler shares (spec §3): signed in
 * (401) → teacher role (403) → owns this classroom (404 — the same answer for
 * "does not exist" and "not yours") → the RLS client. The service client is
 * created by the handler only after this has returned a classroom.
 *
 * Underscore folder: private to the app router, never a route segment.
 */

export const NO_STORE = { 'Cache-Control': 'no-store' } as const

export type ClassroomAuth = { supabase: SupabaseClient; user: User; classroom: TeacherClassroomRow }
export type AssignmentAuth = ClassroomAuth & { assignment: Assignment }

type Denied = { response: NextResponse }

export function jsonError(status: number, error: string, field?: string, headers?: Record<string, string>) {
  return NextResponse.json(field ? { error, field } : { error }, {
    status,
    headers: { ...NO_STORE, ...(headers ?? {}) },
  })
}

export async function authorizeClassroom(classroomId: string): Promise<ClassroomAuth | Denied> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { response: jsonError(401, 'Unauthorized') }
  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return { response: jsonError(403, 'Not a teacher') }
  const classroom = isUuid(classroomId) ? await loadTeacherClassroom(supabase, user.id, classroomId) : null
  if (!classroom) return { response: jsonError(404, 'Classroom not found') }
  return { supabase, user, classroom }
}

/** authorizeClassroom, then the set — which must belong to that classroom (404 otherwise). */
export async function authorizeAssignment(
  classroomId: string,
  assignmentId: string
): Promise<AssignmentAuth | Denied> {
  const auth = await authorizeClassroom(classroomId)
  if ('response' in auth) return auth
  if (!isUuid(assignmentId)) return { response: jsonError(404, 'Set not found') }
  const { data, error } = await auth.supabase
    .from('assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('id', assignmentId)
    .eq('classroom_id', auth.classroom.id)
    .maybeSingle()
  if (error) {
    console.error('[teacher/assignments] set read failed', { assignmentId, error: error.message })
    return { response: jsonError(500, 'Could not load the set.') }
  }
  if (!data) return { response: jsonError(404, 'Set not found') }
  return { ...auth, assignment: toAssignment(data as Record<string, unknown>) }
}

/** Bodies are small JSON objects; anything bigger is not from the composer. */
const MAX_BODY_BYTES = 64 * 1024

/** The JSON body (undefined when empty), or a 400 response for anything else. */
export async function readJson(request: Request): Promise<{ body: unknown } | Denied> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return { response: jsonError(413, 'That request is too large.') }
  if (!text.trim()) return { body: undefined }
  try {
    return { body: JSON.parse(text) as unknown }
  } catch {
    return { response: jsonError(400, 'Invalid JSON', 'body') }
  }
}

/**
 * The answer for anything a handler threw: AssignmentInputError becomes its
 * own status with `{error, field}` (and Retry-After on a 429); anything else
 * is logged and answered with a plain 500 that leaks nothing.
 */
export function errorResponse(err: unknown, context: string, fallback: string) {
  if (err instanceof AssignmentInputError) {
    return jsonError(
      err.status,
      err.message,
      err.field,
      err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined
    )
  }
  console.error(`[teacher/assignments] ${context} failed`, err instanceof Error ? err.message : err)
  return jsonError(500, fallback)
}

/**
 * Run a side effect after the response (notifications, fan-out). Outside a
 * request scope (scripts, tests) it runs inline instead, so it is never
 * silently dropped. The tasks passed here never throw (lib/teacher/notify).
 */
export async function afterResponse(task: () => Promise<unknown>): Promise<void> {
  try {
    after(task)
  } catch {
    await task()
  }
}
