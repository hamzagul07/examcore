import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { isUuid, loadTeacherClassroom, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import { FALLBACK_TIME_ZONE, safeTimeZone } from '@/components/teacher/assignments/format'

/**
 * The gate every class page (Week, Sets, the composer, a set, its print
 * sheet) passes before it reads anything (docs/TEACHER_SYSTEM_SPEC.md §4):
 * signed in (else to sign-in, coming back here), a teacher (else to the
 * student dashboard), and the owner of this classroom (else notFound() — the
 * same answer for "no such class" and "not yours", read through RLS).
 *
 * Wrapped in React's cache() so generateMetadata and the page share one
 * lookup per request.
 *
 * Underscore folder: private to the app router, never a route segment.
 */

export type ClassContext = {
  /** The teacher's RLS client. */
  supabase: SupabaseClient
  userId: string
  classroom: TeacherClassroomRow
}

const loadClassContext = cache(async (classroomId: string, nextPath: string): Promise<ClassContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(nextPath)}`)

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) redirect('/dashboard')

  const classroom = isUuid(classroomId) ? await loadTeacherClassroom(supabase, user.id, classroomId) : null
  if (!classroom) notFound()

  return { supabase, userId: user.id, classroom }
})

/** Signed-in teacher who owns `classroomId`, or a redirect / 404. `nextPath` is where sign-in returns to. */
export function requireClassContext(classroomId: string, nextPath: string): Promise<ClassContext> {
  return loadClassContext(classroomId, nextPath)
}

/**
 * The request's best-guess time zone for rendering deadlines on the server:
 * Vercel's IP-derived zone when it is a real IANA zone, else UTC. Only a
 * first paint — <LocalTime> re-renders in the browser's own zone — but a
 * good guess means most teachers never see a deadline jump by an hour.
 */
export async function requestTimeZone(): Promise<string> {
  try {
    const h = await headers()
    return safeTimeZone(h.get('x-vercel-ip-timezone')) ?? FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

/** A search param as one string (the first when repeated), or null. */
export function firstParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' && v.length > 0 ? v : null
}
