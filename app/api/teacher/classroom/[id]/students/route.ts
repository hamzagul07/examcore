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
  const metrics = computeStudentQuadrants(attempts, profiles)

  // Indexed once rather than scanned per student: `metrics.find(...)` inside a
  // map over the same list is quadratic, and a roster is the one teacher list
  // that grows without anyone thinking about it.
  const metricsById = new Map(metrics.map((m) => [m.studentId, m]))

  const students = studentIds.map((sid) => {
    const profile = profiles.get(sid)
    const metric = metricsById.get(sid)
    return {
      id: sid,
      name: profile?.full_name?.trim() || 'Student',
      accuracy: metric?.accuracy ?? 0,
      attemptCount: metric?.attemptCount ?? 0,
      predictedGrade: metric?.predictedGrade ?? '—',
      quadrant: metric?.quadrant ?? 'under_prepared',
      coverage: metric?.coverage ?? 0,
    }
  })

  return NextResponse.json({ students })
}
