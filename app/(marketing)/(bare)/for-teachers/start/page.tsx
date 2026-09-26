import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { TeacherStartForm } from '@/components/teacher/TeacherStartForm'
import { TeacherNav } from '@/components/teacher/TeacherNav'
import { isTeacherV2 } from '@/lib/teacher/flags'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Set up your class',
  robots: { index: false, follow: false },
}

/**
 * Where a teacher becomes a teacher: board, level, subject and a class name
 * turn the account into a teacher account with its first class.
 *
 * One screen, not a branch of the student wizard — a head of department
 * arriving from a cold email is giving this thirty seconds, and the student
 * flow asks for an exam year and a revision goal they do not have.
 */
export default async function TeacherStartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signup?redirect=${encodeURIComponent('/for-teachers/start')}`)
  }

  // Already a teacher — send them to their desk rather than making them set
  // up a class they did not ask for.
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role === 'teacher') {
    redirect('/teacher/dashboard')
  }

  return (
    <>
      {/* The teacher header without its links: this visitor is not a teacher
          yet, so every destination would refuse them. */}
      <TeacherNav showNav={false} v2={isTeacherV2()} />
      <main className="ms-teacher-start-shell">
        <div className="ms-teacher-start-card">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Teacher desk</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              CLS
            </span>
          </div>
          <h1 className="ms-teacher-start__title">
            Set up your first <em>class</em>
          </h1>
          <p className="ms-teacher-start__lead">
            Four questions, then a six-letter code to give your students. Free for teachers — no card,
            no trial.
          </p>
          <ol className="ms-teacher-start__steps" aria-label="What happens next">
            <li>Students join with the code at markscheme.app/join — they are told what you will see first.</li>
            <li>Set them work from past papers, a topic drill or your own prompt.</li>
            <li>Their marks land on your desk as they hand in; you confirm or re-mark.</li>
          </ol>
          <TeacherStartForm />
        </div>
      </main>
    </>
  )
}
