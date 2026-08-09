import { NextResponse } from 'next/server'
import { requireClassroomTeacher } from '@/lib/teacher/route-guard'
import { getClassroomStudentIds } from '@/lib/teacher-classroom-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await requireClassroomTeacher(id)
  if (!guard.ok) return guard.response
  // The guard already read the row to prove ownership; this route used to
  // verify ownership and then select the same classroom again.
  const { supabase, classroom } = guard.ctx

  const studentIds = await getClassroomStudentIds(supabase, id)

  return NextResponse.json({
    classroom,
    studentCount: studentIds.length,
  })
}
