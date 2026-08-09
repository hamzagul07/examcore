// Server-only. Shared entry check for every classroom-scoped teacher route.
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import type { UserRole } from '@/lib/database.types'

/**
 * The classroom, fetched once by the guard.
 *
 * Returned rather than re-queried: the analytics route used to verify ownership
 * and then select the classroom row again for its name, which is the same read
 * twice on the hot path of every page load.
 */
export type GuardedClassroom = {
  id: string
  name: string
  description: string | null
  invite_code: string | null
  board: string | null
  level: string | null
  subject: string | null
  /** Selected with `*`, so rows carry every column the table has. */
  [key: string]: unknown
}

export type TeacherContext = {
  supabase: SupabaseClient
  user: User
  classroom: GuardedClassroom
}

export type GuardResult =
  | { ok: true; ctx: TeacherContext }
  | { ok: false; response: NextResponse }

/**
 * The whole row, deliberately.
 *
 * Callers return this straight to the client — `/api/teacher/classroom/[id]`
 * did `select('*')` — so narrowing it here would quietly drop fields from a
 * response the teacher UI may already read. One row is cheap; a changed
 * response shape is not.
 */
const CLASSROOM_COLUMNS = '*'

/**
 * Authenticates, confirms the caller is a teacher, and confirms they own this
 * classroom — in two round-trips rather than four.
 *
 * Every classroom route repeated this preamble: getUser, then a role lookup,
 * then an ownership lookup, each awaited in turn. The classroom page fires five
 * of those routes at once, so the same three checks ran fifteen times per load,
 * sequentially within each request. Role and ownership do not depend on each
 * other, so they are fetched together.
 *
 * The role check is kept even though owning the classroom already proves the
 * caller teaches it: `role` is what gates the teacher product, and a seat that
 * has been withdrawn should close the door even on classrooms still owned.
 *
 * Distinguishes 401 / 403 / 404 exactly as the routes did before, so no client
 * behaviour changes.
 */
export async function requireClassroomTeacher(
  classroomId: string
): Promise<GuardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const [{ data: profile }, { data: classroom }] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase
      .from('classrooms')
      .select(CLASSROOM_COLUMNS)
      .eq('id', classroomId)
      .eq('teacher_id', user.id)
      .maybeSingle(),
  ])

  const role = (profile?.role ?? 'student') as UserRole
  if (role !== 'teacher') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not a teacher' }, { status: 403 }),
    }
  }

  // Filtered on teacher_id, so "not found" and "not yours" are deliberately the
  // same answer: a 403 here would confirm the classroom exists to someone who
  // has no business knowing that.
  if (!classroom) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Classroom not found' }, { status: 404 }),
    }
  }

  return {
    ok: true,
    ctx: { supabase, user, classroom: classroom as GuardedClassroom },
  }
}

/**
 * Same check without a classroom, for routes scoped to the teacher themselves
 * (the classroom list, the review queue).
 */
export async function requireTeacherUser(): Promise<
  { ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if ((profile?.role ?? 'student') !== 'teacher') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not a teacher' }, { status: 403 }),
    }
  }

  return { ok: true, supabase, user }
}
