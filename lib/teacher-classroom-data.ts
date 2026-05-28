import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassroomAttempt } from '@/lib/teacher-analytics'

export async function getClassroomStudentIds(
  supabase: SupabaseClient,
  classroomId: string
): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('classroom_memberships')
    .select('student_id')
    .eq('classroom_id', classroomId)

  return (memberships || []).map((m) => m.student_id)
}

export async function getClassroomAttempts(
  supabase: SupabaseClient,
  classroomId: string
): Promise<{ studentIds: string[]; attempts: ClassroomAttempt[] }> {
  const studentIds = await getClassroomStudentIds(supabase, classroomId)
  if (studentIds.length === 0) {
    return { studentIds: [], attempts: [] }
  }

  const { data: attempts } = await supabase
    .from('attempts')
    .select(
      'id, user_id, marks_earned, total_marks, syllabus_tags, time_spent_seconds, created_at, question_text, source_type'
    )
    .in('user_id', studentIds)

  return {
    studentIds,
    attempts: (attempts || []) as ClassroomAttempt[],
  }
}

export async function getStudentProfiles(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, { full_name: string | null }>> {
  if (studentIds.length === 0) return new Map()

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', studentIds)

  return new Map(
    (profiles || []).map((p) => [p.id, { full_name: p.full_name }])
  )
}
