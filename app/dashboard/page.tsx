import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch user's attempts (service role bypasses RLS, filtered by user.id from verified session)
  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, source_type, question_text, created_at,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const attemptsList = attempts || []
  const totalAttempts = attemptsList.length
  const avgScore =
    totalAttempts > 0
      ? Math.round(
          (attemptsList.reduce(
            (sum, a) => sum + a.marks_earned / a.total_marks,
            0
          ) /
            totalAttempts) *
            100
        )
      : 0
  const bestScore =
    totalAttempts > 0
      ? Math.max(
          ...attemptsList.map((a) =>
            Math.round((a.marks_earned / a.total_marks) * 100)
          )
        )
      : 0

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Your dashboard</h1>
            <p className="text-slate-600">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-3xl font-bold text-slate-900">{totalAttempts}</div>
            <div className="text-sm text-slate-600 mt-1">Total attempts</div>
          </div>
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-3xl font-bold text-slate-900">{avgScore}%</div>
            <div className="text-sm text-slate-600 mt-1">Average score</div>
          </div>
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-3xl font-bold text-slate-900">{bestScore}%</div>
            <div className="text-sm text-slate-600 mt-1">Best score</div>
          </div>
        </div>

        {/* Mark new button */}
        <div className="mb-8">
          <Link
            href="/mark"
            className="inline-block px-5 py-3 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium"
          >
            Mark a new answer
          </Link>
        </div>

        {/* Attempts list */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent attempts</h2>

          {attemptsList.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <p className="text-slate-600 mb-4">No attempts yet.</p>
              <Link
                href="/mark"
                className="text-slate-900 underline hover:text-slate-700 font-medium"
              >
                Mark your first answer
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {attemptsList.map((attempt) => {
                const percentage = Math.round(
                  (attempt.marks_earned / attempt.total_marks) * 100
                )
                const scoreColor =
                  percentage === 100
                    ? 'text-green-600'
                    : percentage >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'

                const ms = attempt.mark_schemes as any
                const questionLabel =
                  attempt.source_type === 'past_paper' && ms
                    ? `Q${ms.question_number} — ${ms.paper_code} ${ms.paper_session}`
                    : `Custom: ${(attempt.question_text || '').substring(0, 60)}${
                        (attempt.question_text || '').length > 60 ? '...' : ''
                      }`

                const dateStr = new Date(attempt.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <div
                    key={attempt.id}
                    className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {questionLabel}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{dateStr}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-bold ${scoreColor}`}>
                          {attempt.marks_earned}
                          <span className="text-slate-400">/{attempt.total_marks}</span>
                        </div>
                        <div className="text-xs text-slate-500">{percentage}%</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}