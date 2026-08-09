import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireClassroomTeacher } from '@/lib/teacher/route-guard'
import { getClassroomStudentIds } from '@/lib/teacher-classroom-data'
import {
  buildCohortGapReport,
  headlineGap,
  type GapAttempt,
} from '@/lib/teacher/cohort-gaps'

/** A class set is bounded; this only guards against a pathological read. */
const MAX_ATTEMPTS = 2000

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await requireClassroomTeacher(id)
  if (!guard.ok) return guard.response
  const { supabase } = guard.ctx

  const studentIds = await getClassroomStudentIds(supabase, id)
  if (studentIds.length === 0) {
    return NextResponse.json({
      report: buildCohortGapReport([]),
      headline: null,
      students: 0,
    })
  }

  // Service client: the attempts SELECT policy routes through
  // teacher_student_ids(), so a plain authenticated read comes back empty.
  // Ownership of the classroom was verified above.
  const service = createServiceClient()
  const { data, error } = await service
    .from('attempts')
    .select('user_id, marks_earned, total_marks, ai_marking')
    .in('user_id', studentIds)
    .not('ai_marking', 'is', null)
    // Newest first, so that if the cap is ever reached the report describes the
    // class as it is now. Without an order the cap would take an arbitrary
    // 2,000 rows and quietly present them as the whole picture.
    .order('created_at', { ascending: false })
    .limit(MAX_ATTEMPTS)

  if (error) {
    console.error('[teacher/gaps] attempts read failed:', error.message)
    return NextResponse.json({ error: 'Could not build the report' }, { status: 500 })
  }

  const rows = (data ?? []) as GapAttempt[]
  const report = buildCohortGapReport(rows)

  return NextResponse.json({
    report,
    headline: headlineGap(report),
    students: studentIds.length,
    // Told, not hidden: a truncated report still reads as a complete one.
    truncated: rows.length >= MAX_ATTEMPTS ? MAX_ATTEMPTS : null,
  })
}
