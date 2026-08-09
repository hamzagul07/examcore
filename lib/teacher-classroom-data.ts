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

/**
 * Ceiling on a single classroom read.
 *
 * A class of thirty working through a year of past papers accumulates thousands
 * of attempts, and this read runs on every load of the classroom page. The cap
 * is generous enough that no real class reaches it, and the read is ordered
 * newest-first so that if one ever does, the analytics describe the class as it
 * is now rather than an arbitrary slice of its history.
 */
export const MAX_CLASSROOM_ATTEMPTS = 5000

export async function getClassroomAttempts(
  supabase: SupabaseClient,
  classroomId: string
): Promise<{
  studentIds: string[]
  attempts: ClassroomAttempt[]
  /** True when the cap was hit, so callers can say so rather than imply completeness. */
  truncated: boolean
}> {
  const studentIds = await getClassroomStudentIds(supabase, classroomId)
  if (studentIds.length === 0) {
    return { studentIds: [], attempts: [], truncated: false }
  }

  const { data: attempts, error } = await supabase
    .from('attempts')
    .select(
      'id, user_id, marks_earned, total_marks, syllabus_tags, time_spent_seconds, created_at, question_text, source_type'
    )
    .in('user_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(MAX_CLASSROOM_ATTEMPTS)

  // Previously swallowed: a failed read returned an empty array, so an RLS or
  // connection problem was indistinguishable from a class that had not started.
  // That is exactly how the empty teacher dashboard hid a permission error.
  if (error) {
    console.error('[teacher] classroom attempts read failed:', error.message)
    throw new Error(`Could not read classroom attempts: ${error.message}`)
  }

  const rows = (attempts || []) as ClassroomAttempt[]
  return {
    studentIds,
    attempts: rows,
    truncated: rows.length >= MAX_CLASSROOM_ATTEMPTS,
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
