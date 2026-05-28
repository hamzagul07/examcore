import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/database.types'

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return (data?.role as UserRole) ?? 'student'
}

export async function requireTeacher(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; status: 403 }> {
  const role = await getUserRole(supabase, userId)
  if (role !== 'teacher') return { ok: false, status: 403 }
  return { ok: true }
}

export async function verifyTeacherOwnsClassroom(
  supabase: SupabaseClient,
  teacherId: string,
  classroomId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', teacherId)
    .maybeSingle()
  return !!data
}
