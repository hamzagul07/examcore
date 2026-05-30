import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  FileText,
  NotebookPen,
  LogOut,
  ChevronRight,
  Settings,
  TrendingUp,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { SyllabusTopicBadgeList } from '@/components/SyllabusTopicBadge'
import { TOTAL_SYLLABUS_TOPICS, type SyllabusCode } from '@/lib/syllabus'
import { getSubjectById } from '@/lib/profile-options'
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration'
import { DashboardEntry, AttemptRowAnim } from './dashboard.client'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'

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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, level, subjects')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const greetingName = firstName || 'student'
  const userSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : ['Mathematics']
  const contextTag = profile
    ? [profile.level, ...userSubjects].filter(Boolean).join(' · ')
    : ''
  const nonMathSubjects = userSubjects.filter((name) => {
    const s = getSubjectById(name)
    return s && !s.markingEnabled
  })
  const hasMathSubject = userSubjects.some(
    (name) => getSubjectById(name)?.markingEnabled
  )

  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, source_type, question_text, created_at,
      syllabus_tags,
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

  const uniqueTopics = new Set<SyllabusCode>()
  for (const a of attemptsList) {
    const tags = (a as { syllabus_tags?: string[] | null }).syllabus_tags
    if (tags && tags.length > 0) {
      for (const t of tags) uniqueTopics.add(t)
    }
  }
  const topicsAttempted = uniqueTopics.size

  const streak = computeStreak(
    attemptsList.map((a) => new Date(a.created_at))
  )

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <DashboardEntry>
          {/* ====== Header ====== */}
          <div className="mb-12 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="ec-label-tech mb-4">DASHBOARD</p>
              <h1 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[56px] md:text-[72px]">
                <span className="gradient-text">Welcome back,</span>
                <br />
                <span className="ec-text-gradient">{greetingName}</span>
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {contextTag && (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.15)]">
                    {contextTag}
                  </span>
                )}
                <span className="truncate font-mono text-xs text-slate-500">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/account"
                aria-label="Account settings"
                className="ec-btn-secondary text-sm"
                style={{ padding: '10px 16px' }}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="ec-btn-secondary text-sm"
                  style={{ padding: '10px 16px' }}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>

          {/* ====== Bento grid for stats ====== */}
          <div className="bento-grid mb-8">
            {/* Big card — total attempts */}
            <div className="ec-card relative overflow-hidden p-8 col-span-6 row-span-2 md:col-span-3 md:p-10">
              <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/20 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
              <div className="relative">
                <p className="ec-label-tech mb-4">TOTAL ATTEMPTS</p>
                <div className="text-[112px] font-extrabold leading-none tracking-[-0.04em] ec-text-gradient brand-breathe">
                  {totalAttempts}
                </div>
                <p className="mt-5 text-base text-slate-400">
                  questions marked all-time
                </p>
                {totalAttempts > 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    {avgScore}% average · {bestScore}% best ever
                  </p>
                )}
              </div>
            </div>

            {/* Avg score */}
            <div className="ec-card p-6 col-span-3 md:col-span-2">
              <p className="ec-label-tech ec-label-tech-cyan mb-3">AVERAGE</p>
              <div className="text-5xl font-extrabold tracking-tight text-white">
                {avgScore}
                <span className="text-3xl text-slate-600">%</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">across all attempts</p>
            </div>

            {/* Best */}
            <div className="ec-card p-6 col-span-3 md:col-span-1">
              <p className="ec-label-tech ec-label-tech-violet mb-3">BEST</p>
              <div className="text-4xl font-extrabold text-white">
                {bestScore}
                <span className="text-2xl text-slate-600">%</span>
              </div>
            </div>

            {/* Streak */}
            <div className="ec-card p-6 col-span-3 md:col-span-2 relative overflow-hidden">
              {streak > 0 && (
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/20 blur-[40px]" />
              )}
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="ec-label-tech ec-label-tech-orange mb-3">STREAK</p>
                  <div className="streak-glow text-4xl font-extrabold text-orange-400">
                    {streak}
                    <span className="ml-1 text-base font-semibold text-slate-500">
                      day{streak === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <Flame
                  className={`h-8 w-8 ${
                    streak > 0 ? 'text-orange-400' : 'text-slate-700'
                  }`}
                  strokeWidth={1.75}
                />
              </div>
            </div>

            {/* Topics */}
            <div className="ec-card p-6 col-span-3 md:col-span-1">
              <p className="ec-label-tech mb-3">TOPICS (MATHEMATICS)</p>
              <div className="text-4xl font-extrabold text-white">
                {topicsAttempted}
                <span className="text-xl text-slate-600">
                  /{TOTAL_SYLLABUS_TOPICS}
                </span>
              </div>
            </div>
          </div>

          {nonMathSubjects.length > 0 && (
            <div className="mb-8 space-y-3">
              {nonMathSubjects.map((name) => (
                <div
                  key={name}
                  className="ec-card border-amber-500/20 p-4 text-sm text-slate-400"
                >
                  Detailed analytics coming soon for{' '}
                  <span className="font-semibold text-white">{name}</span>.
                  {hasMathSubject && ' Mathematics stats are shown above.'}
                </div>
              ))}
            </div>
          )}

          {/* ====== Primary CTA + progress link ====== */}
          <div className="bento-grid mb-12">
            <Link
              href="/mark"
              className="ec-card group relative col-span-6 overflow-hidden p-8 transition-all duration-300 hover:-translate-y-1 md:col-span-4"
              style={{
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 48px -12px rgba(16,185,129,0.3), 0 0 48px rgba(16,185,129,0.15)',
              }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-emerald-500/30 blur-[100px] transition-opacity duration-300 group-hover:opacity-90" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-[100px]" />
              <div className="pointer-events-none absolute right-1/4 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-violet-500/15 blur-[80px]" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="ec-label-tech mb-4">MARK NEW ANSWER</p>
                  <h2 className="text-4xl font-extrabold tracking-tight text-white">
                    Ready to mark
                    <br />
                    <span className="ec-text-gradient">something new?</span>
                  </h2>
                  <p className="mt-3 max-w-md text-slate-400">
                    Upload your answer and get marked in 30 seconds.
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_32px_rgba(16,185,129,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <Plus className="h-6 w-6 text-emerald-300" strokeWidth={2} />
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/progress"
              className="ec-card ec-card-interactive group col-span-6 p-8 md:col-span-2"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <TrendingUp className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-bold text-white">
                View detailed progress
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Mastery, trajectory, predicted grade
                {hasMathSubject ? ' (Mathematics)' : ''}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 transition-transform duration-200 group-hover:translate-x-1">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>

          {/* ====== Recent attempts list ====== */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="ec-label-tech mb-2">RECENT</p>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Recent attempts
                </h2>
              </div>
              <Link
                href="/dashboard/progress"
                className="text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
              >
                View detailed progress →
              </Link>
            </div>

            {attemptsList.length === 0 ? (
              <div className="ec-card relative overflow-hidden p-12 text-center">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/15 blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-violet-500/15 blur-[100px]" />
                <div className="relative">
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <EmptyStateIllustration variant="no-attempts" size={180} />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Ready to mark your first answer?
                  </h3>
                  <p className="mx-auto mb-7 mt-3 max-w-sm text-base leading-relaxed text-slate-400">
                    Upload a photo of your handwritten working and get
                    examiner-grade feedback in 30 seconds.
                  </p>
                  <Link href="/mark" className="ec-btn-primary inline-flex">
                    <Plus className="h-4 w-4" />
                    Mark your first answer
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {attemptsList.map((attempt, idx) => {
                  const percentage = Math.round(
                    (attempt.marks_earned / attempt.total_marks) * 100
                  )
                  const scoreColor =
                    percentage === 100
                      ? 'text-emerald-400'
                      : percentage >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'

                  const ms = attempt.mark_schemes as {
                    question_number?: string | null
                    paper_code?: string | null
                    paper_session?: string | null
                  } | null
                  const questionLabel =
                    attempt.source_type === 'past_paper' && ms
                      ? `Q${ms.question_number} — ${ms.paper_code} ${ms.paper_session}`
                      : `Custom: ${(attempt.question_text || '').substring(0, 60)}${
                          (attempt.question_text || '').length > 60 ? '...' : ''
                        }`

                  const dateStr = new Date(attempt.created_at).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )

                  return (
                    <AttemptRowAnim key={attempt.id} index={idx}>
                      <Link
                        href={`/dashboard/attempt/${attempt.id}`}
                        className="ec-card ec-card-interactive group block p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                                attempt.source_type === 'past_paper'
                                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                                  : 'border-violet-500/30 bg-violet-500/10 text-violet-400 shadow-[0_0_16px_rgba(139,92,246,0.2)]'
                              }`}
                            >
                              {attempt.source_type === 'past_paper' ? (
                                <FileText className="h-5 w-5" />
                              ) : (
                                <NotebookPen className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-white">
                                {questionLabel}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-slate-500">
                                {dateStr}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <div
                                className={`text-3xl font-extrabold tracking-tight ${scoreColor}`}
                              >
                                {attempt.marks_earned}
                                <span className="text-slate-700">
                                  /{attempt.total_marks}
                                </span>
                              </div>
                              <div className="font-mono text-xs font-medium text-slate-500">
                                {percentage}%
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-600 transition-all duration-200 group-hover:translate-x-1 group-hover:text-emerald-400" />
                          </div>
                        </div>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full border border-white/5 bg-dark-900">
                          <div
                            className={`animate-shimmer h-full rounded-full transition-all duration-500 ${
                              percentage === 100
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                : percentage >= 50
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                : 'bg-gradient-to-r from-red-400 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                            }`}
                            style={{
                              width: `${percentage}%`,
                              backgroundSize: '200% 100%',
                            }}
                          />
                        </div>
                        {(attempt as { syllabus_tags?: string[] | null })
                          .syllabus_tags &&
                          (attempt as { syllabus_tags?: string[] | null })
                            .syllabus_tags!.length > 0 && (
                            <div className="mt-3">
                              <SyllabusTopicBadgeList
                                codes={
                                  (attempt as {
                                    syllabus_tags?: string[] | null
                                  }).syllabus_tags!
                                }
                                max={2}
                                size="sm"
                              />
                            </div>
                          )}
                      </Link>
                    </AttemptRowAnim>
                  )
                })}
              </div>
            )}
          </div>
        </DashboardEntry>
      </div>
      <OmniAIBridge
        context={{
          type: 'dashboard_home',
          data: {
            name: greetingName,
            streak,
            attemptCount: totalAttempts,
          },
        }}
      />
    </main>
  )
}

/**
 * Streak = consecutive UTC days (going back from today) with at least one
 * attempt. Honors a one-day grace period.
 */
function computeStreak(timestamps: Date[]): number {
  if (timestamps.length === 0) return 0

  const days = new Set<string>()
  for (const ts of timestamps) {
    days.add(ts.toISOString().slice(0, 10))
  }

  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  let cursor: Date
  if (days.has(todayKey)) {
    cursor = new Date(`${todayKey}T00:00:00Z`)
  } else if (days.has(yesterdayKey)) {
    cursor = new Date(`${yesterdayKey}T00:00:00Z`)
  } else {
    return 0
  }

  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
