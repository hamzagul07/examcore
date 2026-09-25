import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { isUuid, loadTeacherClassroom } from '@/lib/teacher/list-classrooms'
import { loadClassWeek, parseIsoWeek } from '@/lib/teacher/week'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' } as const

function jsonError(status: number, error: string, field?: string) {
  return NextResponse.json(field ? { error, field } : { error }, { status, headers: NO_STORE })
}

/**
 * GET `?week=YYYY-Www` → `ClassWeek` (docs/TEACHER_SYSTEM_SPEC.md §3 `T/week`;
 * lib/teacher/week.ts has the rules). No `week` means the current ISO week
 * (UTC); anything that is not a real ISO week is a 400 on `week`.
 *
 * Route shape as every teacher route: 401 signed out → 403 not a teacher →
 * 404 not the caller's classroom (RLS read) → the teacher's RLS client. The
 * service client is created only for an ARCHIVED class, after ownership is
 * proven, because its retained hand-ins are readable only as the service
 * role. Private data: never cached.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return jsonError(401, 'Unauthorized')

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return jsonError(403, 'Not a teacher')

  // The week is part of the v2 teacher system; with TEACHER_V2=0 it is dark.
  if (!isTeacherV2()) return jsonError(404, 'Not found')

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) return jsonError(404, 'Classroom not found')

  const raw = new URL(request.url).searchParams.get('week')
  let week: string | undefined
  if (raw !== null && raw.trim() !== '') {
    const parsed = parseIsoWeek(raw)
    if (!parsed) return jsonError(400, 'week must be an ISO week such as 2026-W39.', 'week')
    week = parsed.key
  }

  try {
    const result = await loadClassWeek(supabase, classroom.id, {
      week,
      admin: classroom.archived_at ? createServiceClient() : undefined,
    })
    if (!result) return jsonError(404, 'Classroom not found')
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    console.error('[teacher/week] load failed', {
      classroomId: classroom.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return jsonError(500, 'Could not load the week.')
  }
}
