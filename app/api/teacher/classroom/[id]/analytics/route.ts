import { NextResponse } from 'next/server'
import { requireClassroomTeacher } from '@/lib/teacher/route-guard'
import { summarizeClassAnalytics } from '@/lib/teacher-analytics'
import { getClassroomAttempts } from '@/lib/teacher-classroom-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await requireClassroomTeacher(id)
  if (!guard.ok) return guard.response
  const { supabase, classroom } = guard.ctx

  // The classroom row comes from the guard, which already had to read it to
  // prove ownership — this route used to select it a second time for the name.
  const { studentIds, attempts, truncated } = await getClassroomAttempts(supabase, id)
  const summary = summarizeClassAnalytics(attempts, studentIds.length)

  return NextResponse.json({
    classroomName: classroom.name ?? 'Classroom',
    ...summary,
    truncated,
  })
}
