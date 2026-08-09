import { NextResponse } from 'next/server'
import { requireClassroomTeacher } from '@/lib/teacher/route-guard'
import { computeStudentQuadrants } from '@/lib/teacher-analytics'
import {
  getClassroomAttempts,
  getStudentProfiles,
} from '@/lib/teacher-classroom-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await requireClassroomTeacher(id)
  if (!guard.ok) return guard.response
  const { supabase } = guard.ctx

  const { studentIds, attempts } = await getClassroomAttempts(supabase, id)
  const profiles = await getStudentProfiles(supabase, studentIds)
  const students = computeStudentQuadrants(attempts, profiles)

  return NextResponse.json({ students })
}
