import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { listTeacherClassrooms } from '@/lib/teacher/list-classrooms'
import { capForTier, teacherMarkCap } from '@/lib/billing/caps'
import { TeacherDashboardClient } from '@/components/teacher/TeacherDashboardClient'
import { TeacherSeatRequestCard } from '@/components/teacher/TeacherSeatRequestCard'

export const dynamic = 'force-dynamic'

/**
 * Whether to show the seat notice, and in which state.
 *
 * Both reads go through the service client: `teacher_verified_at` is not
 * selectable by the account that owns it (20260807182215_user_profiles_column_grants),
 * and `teacher_seat_requests` is service-role-only by design — the subject of a
 * request must not be able to read or touch its status.
 */
async function loadSeatState(
  userId: string
): Promise<{ verified: boolean; pending: boolean }> {
  const service = createServiceClient()

  const [{ data: profile }, { data: request }] = await Promise.all([
    service
      .from('user_profiles')
      .select('teacher_verified_at')
      .eq('id', userId)
      .maybeSingle(),
    service
      .from('teacher_seat_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle(),
  ])

  return { verified: !!profile?.teacher_verified_at, pending: !!request }
}

/**
 * Server-first classroom list (PERF-01) — first paint is not an empty client fetch.
 * Mutations (retry, seed demo) stay on the client island.
 */
export default async function TeacherDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?next=/teacher/dashboard')
  }

  const [result, seat] = await Promise.all([
    listTeacherClassrooms(supabase, user.id),
    loadSeatState(user.id),
  ])

  const seatCard = seat.verified ? null : (
    <TeacherSeatRequestCard
      initialPending={seat.pending}
      teacherCap={teacherMarkCap()}
      freeCap={capForTier('free')}
    />
  )

  if (!result.ok) {
    if (result.status === 403) {
      redirect('/dashboard')
    }
    return (
      <TeacherDashboardClient initial={{ error: result.error }} seatCard={seatCard} />
    )
  }

  return (
    <TeacherDashboardClient
      initial={{ classrooms: result.classrooms }}
      seatCard={seatCard}
    />
  )
}
