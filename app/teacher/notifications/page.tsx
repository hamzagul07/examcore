import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { NotificationsInbox } from '@/components/community/NotificationsInbox'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Notifications' }

/**
 * A teacher's full notification list — hand-ins, removals, seat decisions —
 * inside the teacher frame, where the bell's "See all notifications" leads.
 * The Exam Room page (/community/notifications) lists the same rows, but in
 * marketing chrome and without the teacher nav; a teacher following their
 * own bell should not leave their desk. The list itself is the shared client
 * inbox (loading, empty and error states included).
 */
export default async function TeacherNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent('/teacher/notifications')}`)
  const teacher = await requireTeacher(supabase, user.id)
  if (!teacher.ok) redirect('/dashboard')

  return (
    <TeacherPageContainer className="ms-teacher-page max-w-3xl">
      <NotificationsInbox signInNext="/teacher/notifications" />
    </TeacherPageContainer>
  )
}
