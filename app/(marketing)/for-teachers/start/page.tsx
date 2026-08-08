import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createOnboardingSaveToken } from '@/lib/onboarding/save-token'
import { TeacherStartForm } from '@/components/teacher/TeacherStartForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Set up your classroom',
  robots: { index: false, follow: false },
}

/**
 * Where a teacher actually becomes a teacher.
 *
 * Until now there was no such place: the onboarding wizard hardcoded
 * `role: 'student'`, so the entire teacher side of the product — classrooms,
 * the review queue, the cohort gap report — was unreachable by anyone who had
 * not been edited into the database by hand. The backend supported it the whole
 * time; only the way in was missing.
 */
export default async function TeacherStartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signup?redirect=${encodeURIComponent('/for-teachers/start')}`)
  }

  // Already a teacher — send them to their classrooms rather than making them
  // set up a second one they did not ask for.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'teacher') {
    redirect('/teacher/dashboard')
  }

  const saveToken = createOnboardingSaveToken(user.id)

  return (
    <div className="ms-teacher-start-shell">
      <div className="ms-teacher-start-card">
        <p className="ec-label-tech ms-teacher-start__eyebrow">FOR TEACHERS</p>
        <h1 className="ms-teacher-start__title">Set up your first class</h1>
        <p className="ms-teacher-start__lead">
          Four questions, then you get a code to give your students. Marking their
          work is free for you — no card, no trial.
        </p>
        <TeacherStartForm saveToken={saveToken} />
      </div>
    </div>
  )
}
