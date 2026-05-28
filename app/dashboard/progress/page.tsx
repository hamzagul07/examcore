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
import { getSubjectById } from '@/lib/profile-options'
import {
  getSyllabusByCode,
  getSyllabusSubjectName,
  getTotalSyllabusTopics,
  hasSyllabusTree,
} from '@/lib/syllabi'
import {
  filterAttemptsBySubject,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'

import { SyllabusCoverage } from '@/components/progress/SyllabusCoverage'
import { GradeTrajectory } from '@/components/progress/GradeTrajectory'
import { MasteryMatrix } from '@/components/progress/MasteryMatrix'
import { SpeedAccuracy } from '@/components/progress/SpeedAccuracy'
import { ActionPlan } from '@/components/progress/ActionPlan'
import { ProgressSubjectPicker } from '@/components/progress/ProgressSubjectPicker'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PageProps = {
  searchParams: Promise<{ subject?: string }>
}

export default async function ProgressPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, subjects')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const userSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : ['Mathematics']

  const subjectOptions = userSubjects
    .map((name) => getSubjectById(name))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({
      code: s.code,
      label: s.label,
      hasTree: hasSyllabusTree(s.code),
    }))

  const defaultCode =
    subjectOptions.find((s) => s.hasTree && s.code === '9709')?.code ??
    subjectOptions.find((s) => s.hasTree)?.code ??
    subjectOptions[0]?.code ??
    '9709'

  const selectedCode =
    params.subject && subjectOptions.some((s) => s.code === params.subject)
      ? params.subject
      : defaultCode

  const selectedSubject = subjectOptions.find((s) => s.code === selectedCode)
  const syllabus = getSyllabusByCode(selectedCode)
  const analyticsAvailable = !!syllabus?.length

  const { data: rawAttempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, syllabus_tags, created_at,
      time_spent_seconds, question_text, source_type,
      mark_schemes ( paper_code )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const allAttempts = (rawAttempts || []) as AttemptWithPaper[]
  const filteredReal = filterAttemptsBySubject(allAttempts, selectedCode)
  const hasSubjectData = filteredReal.length > 0

  const usePreview =
    !hasSubjectData && selectedCode === '9709' && allAttempts.length === 0
  const attempts: AttemptLite[] = usePreview ? MOCK_ATTEMPTS : filteredReal
  const showPreviewBanner = usePreview

  const masteries = analyticsAvailable
    ? calculateMastery(attempts, syllabus)
    : []
  const coverage = calculateSyllabusCoverage(masteries)
  const prediction = predictGrade(attempts, masteries)
  const streak = computeStreak(attempts.map((a) => new Date(a.created_at)))
  const subjectLabel =
    getSyllabusSubjectName(selectedCode) ||
    selectedSubject?.label ||
    'Cambridge A-Level'
  const totalTopics = getTotalSyllabusTopics(selectedCode)
  const actionItems = generateActionPlan(attempts, masteries, streak, {
    subjectLabel: `Cambridge ${selectedCode} ${subjectLabel}`,
    totalTopics: totalTopics || 38,
  })

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
              derived from your marked {subjectLabel} attempts.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 font-mono text-xs font-medium text-slate-400 backdrop-blur">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {lastUpdated}
          </div>
        </div>

        <ProgressSubjectPicker
          subjects={subjectOptions}
          selectedCode={selectedCode}
        />

        {showPreviewBanner && <PreviewBanner />}

        {!analyticsAvailable && (
          <div className="mb-6 animate-entry">
            <div className="ec-card border-amber-500/20 p-4 text-sm text-slate-400">
              Detailed topic analytics coming soon for{' '}
              <span className="font-semibold text-white">{subjectLabel}</span>.
              Mark questions to build your score history — the mastery matrix
              will unlock once the syllabus topic map is ready.
            </div>
          </div>
        )}

        {analyticsAvailable && !hasSubjectData && !showPreviewBanner && (
          <div className="mb-6 animate-entry">
            <div className="ec-card border-white/10 p-4 text-sm text-slate-400">
              No {subjectLabel} attempts yet.{' '}
              <Link href="/mark" className="font-semibold text-emerald-400 hover:underline">
                Mark your first question
              </Link>{' '}
              to populate this dashboard.
            </div>
          </div>
        )}

        <div className="space-y-5 sm:space-y-6">
          {analyticsAvailable && (
            <>
              <div className="animate-entry stagger-1">
                <SyllabusCoverage
                  masteries={masteries}
                  coverage={coverage}
                  hasAnyData={hasSubjectData || showPreviewBanner}
                  subjectLabel={`Cambridge ${selectedCode} ${subjectLabel}`}
                  totalTopics={totalTopics}
                />
              </div>

              <div className="animate-entry stagger-2">
                <GradeTrajectory attempts={attempts} prediction={prediction} />
              </div>

              <div className="animate-entry stagger-3">
                <MasteryMatrix
                  masteries={masteries}
                  attempts={attempts}
                  hasAnyData={hasSubjectData || showPreviewBanner}
                  subjectCode={selectedCode}
                />
              </div>
            </>
          )}

          <div className="animate-entry stagger-4">
            <SpeedAccuracy attempts={attempts} />
          </div>

          {analyticsAvailable && (
            <div className="animate-entry stagger-5">
              <ActionPlan items={actionItems} />
            </div>
          )}
        </div>
      </div>
      {analyticsAvailable && (
        <OmniAIBridge
          context={{
            type: 'mastery_matrix',
            data: { weakTopics, coverage },
          }}
        />
      )}
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
