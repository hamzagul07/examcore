import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacher } from '@/lib/teacher-auth'

export type TeacherClassroomRow = {
  id: string
  name: string
  description: string | null
  invite_code: string | null
  board: string | null
  level: string | null
  subject: string | null
  created_at: string
  studentCount: number
}

export type ListClassroomsResult =
  | { ok: true; classrooms: TeacherClassroomRow[] }
  | { ok: false; status: 401 | 403 | 500; error: string }

/** Shared by the teacher dashboard page and GET /api/teacher/classrooms. */
export async function listTeacherClassrooms(
  supabase: SupabaseClient,
  userId: string
): Promise<ListClassroomsResult> {
  const teacherCheck = await requireTeacher(supabase, userId)
  if (!teacherCheck.ok) {
    return { ok: false, status: 403, error: 'Not a teacher' }
  }

  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select('id, name, description, invite_code, board, level, subject, created_at')
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[teacher/classrooms] list failed:', error)
    return { ok: false, status: 500, error: 'Failed to load classrooms' }
  }

  const classroomList = classrooms || []
  const ids = classroomList.map((c) => c.id)
  const counts = new Map<string, number>()
  if (ids.length) {
    const { data: memberships, error: membershipError } = await supabase
      .from('classroom_memberships')
      .select('classroom_id')
      .in('classroom_id', ids)
    if (membershipError) {
      console.error('[teacher/classrooms] membership count failed:', membershipError)
    }
    for (const m of memberships ?? []) {
      counts.set(m.classroom_id, (counts.get(m.classroom_id) ?? 0) + 1)
    }
  }

  return {
    ok: true,
    classrooms: classroomList.map((c) => ({
      ...c,
      studentCount: counts.get(c.id) ?? 0,
    })),
  }
}
