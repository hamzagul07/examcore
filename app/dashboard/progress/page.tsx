import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react'

import {
  calculateMastery,
  calculateSyllabusCoverage,
  type AttemptLite,
} from '@/lib/mastery'
import { predictGrade } from '@/lib/prediction'
import { generateActionPlan } from '@/lib/action-plan'
import { MOCK_ATTEMPTS, PREVIEW_BANNER_COPY } from '@/lib/mock-data'

import { SyllabusCoverage } from '@/components/progress/SyllabusCoverage'
import { GradeTrajectory } from '@/components/progress/GradeTrajectory'
import { MasteryMatrix } from '@/components/progress/MasteryMatrix'
import { SpeedAccuracy } from '@/components/progress/SpeedAccuracy'
import { ActionPlan } from '@/components/progress/ActionPlan'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'

// Always render fresh — progress data changes with every new attempt and
// caching would lie to the user.
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ProgressPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]

  // Pull up to 200 attempts for analysis. Newest-first ordering matters: the
  // prediction logic slices the first 10 for "recent form".
  const { data: rawAttempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, syllabus_tags, created_at,
      time_spent_seconds, question_text, source_type
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const realAttempts: AttemptLite[] = (rawAttempts || []) as AttemptLite[]
  const hasAnyData = realAttempts.length > 0

  // Preview mode: when the user has zero attempts we feed mock data to every
  // derived view so the dashboard visualises what it WILL look like rather
  // than showing five empty-state cards. A banner up top makes the framing
  // explicit so we don't lie about their actual progress.
  const attempts = hasAnyData ? realAttempts : MOCK_ATTEMPTS

  // All derived state computed once, server-side. Components stay dumb.
  const masteries = calculateMastery(attempts)
  const coverage = calculateSyllabusCoverage(masteries)
  const prediction = predictGrade(attempts, masteries)
  const streak = computeStreak(attempts.map((a) => new Date(a.created_at)))
  const actionItems = generateActionPlan(attempts, masteries, streak)

  const lastUpdated = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const weakTopics = masteries
    .filter((m) => m.level === 'critical')
    .sort((a, b) => a.percentage - b.percentage)
    .map((m) => ({
      code: m.code,
      name: m.name,
      percentage: m.percentage,
    }))

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-entry">
          <div>
            <Link
              href="/dashboard"
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-slate-400 backdrop-blur transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to dashboard
            </Link>
            <p className="ec-label-tech mb-4">PROGRESS</p>
            <h1 className="text-[44px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[56px] md:text-[72px]">
              <span className="gradient-text">
                {firstName ? `${firstName}'s` : 'Your'}
              </span>
              <br />
              <span className="ec-text-gradient">progress.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
              Mastery, coverage, predicted grade, and your next three moves —
              all derived from your marked attempts.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 font-mono text-xs font-medium text-slate-400 backdrop-blur">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {lastUpdated}
          </div>
        </div>

        {!hasAnyData && <PreviewBanner />}

        {/* Layout — when in preview mode we pass hasAnyData=true to the
            children so they render the mock data without their own empty
            states. The banner above makes the framing clear. */}
        <div className="space-y-5 sm:space-y-6">
          <div className="animate-entry stagger-1">
            <SyllabusCoverage
              masteries={masteries}
              coverage={coverage}
              hasAnyData
            />
          </div>

          <div className="animate-entry stagger-2">
            <GradeTrajectory attempts={attempts} prediction={prediction} />
          </div>

          <div className="animate-entry stagger-3">
            <MasteryMatrix
              masteries={masteries}
              attempts={attempts}
              hasAnyData
            />
          </div>

          <div className="animate-entry stagger-4">
            <SpeedAccuracy attempts={attempts} />
          </div>

          <div className="animate-entry stagger-5">
            <ActionPlan items={actionItems} />
          </div>
        </div>
      </div>
      <OmniAIBridge
        context={{
          type: 'mastery_matrix',
          data: { weakTopics, coverage },
        }}
      />
    </main>
  )
}

function PreviewBanner() {
  return (
    <div className="mb-6 animate-entry">
      <div className="ec-card relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-[60px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-500/15 blur-[60px]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Sparkles className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  {PREVIEW_BANNER_COPY.title}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                {PREVIEW_BANNER_COPY.body}
              </p>
            </div>
          </div>
          <Link
            href={PREVIEW_BANNER_COPY.ctaHref}
            className="ec-btn-primary shrink-0 self-start text-sm sm:self-center"
            style={{ padding: '12px 20px' }}
          >
            {PREVIEW_BANNER_COPY.ctaText}
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Same streak logic as the main dashboard. Kept here (vs. exported from one
 * spot) to avoid creating a one-line module; if a third caller appears we
 * promote it to `lib/streak.ts`.
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
