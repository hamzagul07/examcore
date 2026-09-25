import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { isUuid, loadClassRoster, loadTeacherClassroom } from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'

/**
 * GET → `{ students: RosterStudent[] }` — every member the class has had,
 * active first (replaces the old `T/students` GET). Names come only from the
 * teacher_roster_profiles RPC; see loadClassRoster for what is computed and
 * for whom.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })

  // Service client only now that ownership is proven (spec §3).
  const result = await loadClassRoster(supabase, createServiceClient(), classroom)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ students: result.students }, { headers: { 'Cache-Control': 'no-store' } })
}
