import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { listTeacherClassrooms } from '@/lib/teacher/list-classrooms'
import { TeacherDashboardClient } from '@/components/teacher/TeacherDashboardClient'

export const dynamic = 'force-dynamic'

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

  const result = await listTeacherClassrooms(supabase, user.id)
  if (!result.ok) {
    if (result.status === 403) {
      redirect('/dashboard')
    }
    return <TeacherDashboardClient initial={{ error: result.error }} />
  }

  return <TeacherDashboardClient initial={{ classrooms: result.classrooms }} />
}
