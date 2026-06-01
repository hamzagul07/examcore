import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import {
  calculateParentMastery,
  calculateSyllabusCoverage,
  flattenLeafMasteries,
  type AttemptLite,
} from '@/lib/mastery'
import { predictGrade } from '@/lib/prediction'
import { generateActionPlan } from '@/lib/action-plan'
import { getSubjectById } from '@/lib/profile-options'
import {
  getSyllabusByCode,
  getSyllabusSubjectName,
  getTotalSyllabusLeaves,
  hasSyllabusTree,
} from '@/lib/syllabi'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'

import { SyllabusCoverage } from '@/components/progress/SyllabusCoverage'
import { GradeTrajectory } from '@/components/progress/GradeTrajectory'
import { MasteryMatrix } from '@/components/progress/MasteryMatrix'
import { ProgressSubjectPicker } from '@/components/progress/ProgressSubjectPicker'
import { ProgressTabs } from '@/components/progress/ProgressTabs'
import { InsightsTab } from '@/components/progress/insights/InsightsTab'
import { DrillToast } from '@/components/progress/insights/DrillToast'
import { JourneyTimeline } from '@/components/progress/timeline/JourneyTimeline'
import { AttemptsList, type AttemptListRow } from '@/components/progress/AttemptsList'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { MasteryDashboardTeaser } from '@/components/billing/MasteryDashboardTeaser'
import { isPaidTier } from '@/lib/billing/features'
import type { SubscriptionTier } from '@/lib/database.types'

import {
  resolveDashboardState,
  type Recommendation,
} from '@/lib/insights/types'
import { analysePatterns, analyseSpeedProfile } from '@/lib/insights/patterns'
import { deriveWins } from '@/lib/insights/wins'
import { buildTimeline } from '@/lib/insights/timeline'
import { buildHeroInsight } from '@/lib/insights/hero'
import {
  fetchGenericRecommendations,
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
} from '@/lib/insights/recommendations'
import { computeStreak } from '@/lib/dashboard/streak'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RawAttemptRow = AttemptWithPaper & {
  error_classifications?: AttemptLite['error_classifications']
  mark_schemes?: AttemptListRow['mark_schemes']
}

type PageProps = {
  searchParams: Promise<{ subject?: string; tab?: string }>
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
    .select('full_name, subjects, level')
    .eq('id', user.id)
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .maybeSingle()

  const userTier = (subscription?.tier ?? 'free') as SubscriptionTier
  const masteryUnlocked = isPaidTier(userTier)

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const userSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : ['Mathematics']

  const profileLevel = profile?.level ?? 'A-Level'
  const subjectOptions = userSubjects
    .map((name) => getSubjectById(name, profileLevel))
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
      time_spent_seconds, question_text, source_type, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const allAttempts = (rawAttempts || []) as RawAttemptRow[]
  const filteredRaw = allAttempts.filter(
    (a) => getAttemptSubjectCode(a) === selectedCode
  )
  const attempts: AttemptLite[] = filteredRaw

  const subjectLabel =
    getSyllabusSubjectName(selectedCode) ||
    selectedSubject?.label ||
    'Cambridge A-Level'

  const parentMasteries = analyticsAvailable
    ? calculateParentMastery(attempts, selectedCode)
    : []
  const masteries = flattenLeafMasteries(parentMasteries)
  const coverage = calculateSyllabusCoverage(masteries)
  const prediction = predictGrade(attempts, masteries)
  const streak = computeStreak(attempts.map((a) => new Date(a.created_at)))
  const totalTopics = getTotalSyllabusLeaves(selectedCode)
  const actionItems = generateActionPlan(attempts, masteries, streak, {
    subjectLabel: `Cambridge ${selectedCode} ${subjectLabel}`,
    totalTopics: totalTopics || 38,
  })

  // ---- insights derivation (all from real data) ----
  const state = resolveDashboardState(attempts.length)
  const patterns = analysePatterns(attempts)
  const speedProfile = analyseSpeedProfile(attempts)
  const wins = deriveWins(attempts, masteries, streak)
  const timelineStations = buildTimeline(attempts)

  // Recommendations resolve to real mark_schemes rows. Only fetched when there's
  // a point: active paid users get topic-targeted questions; low-attempt users
  // get generic subject starters.
  let recommendations: Recommendation[] = []
  let genericRecommendations = false
  if (analyticsAvailable && state === 'active') {
    const targets = topicTargetsFromMasteries(masteries)
    recommendations = await fetchTopicRecommendations(supabaseAdmin, targets)
    if (recommendations.length === 0) {
      recommendations = await fetchGenericRecommendations(
        supabaseAdmin,
        selectedCode,
        subjectLabel
      )
    }
  } else if (state === 'low') {
    recommendations = await fetchGenericRecommendations(
      supabaseAdmin,
      selectedCode,
      subjectLabel
    )
    genericRecommendations = true
  }

  const heroInsight = buildHeroInsight({
    state,
    attempts,
    masteries,
    patterns,
    recommendations,
    prediction,
    subjectLabel,
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
    .map((m) => ({ code: m.code, name: m.name, percentage: m.percentage }))

  // ---- tab content ----
  // Insights (diagnosis + prescription + reward) and the Journey timeline are
  // open to every tier — that's the coaching hook. The deeper mastery analytics
  // (coverage, trajectory, matrix) stay behind the existing paywall in the
  // Detailed topics tab.
  const insightsNode = (
    <InsightsTab
      state={state}
      heroInsight={heroInsight}
      patterns={patterns}
      speedProfile={speedProfile}
      recommendations={recommendations}
      actionItems={actionItems}
      genericRecommendations={genericRecommendations}
      wins={wins}
    />
  )

  const journeyNode = (
    <JourneyTimeline stations={timelineStations} subjectLabel={subjectLabel} />
  )

  const topicsInner = analyticsAvailable ? (
    <div className="space-y-5">
      <SyllabusCoverage
        masteries={masteries}
        coverage={coverage}
        hasAnyData={attempts.length > 0}
        subjectLabel={`Cambridge ${selectedCode} ${subjectLabel}`}
        totalTopics={totalTopics}
      />
      <GradeTrajectory attempts={attempts} prediction={prediction} />
      <MasteryMatrix
        parentMasteries={parentMasteries}
        attempts={attempts}
        hasAnyData={attempts.length > 0}
        subjectCode={selectedCode}
        subjectLabel={subjectLabel}
        emptyBanner={attempts.length === 0}
      />
    </div>
  ) : (
    <div className="ec-card border-amber-500/20 p-5 text-sm text-[var(--ec-text-secondary)]">
      Detailed topic analytics are coming soon for{' '}
      <span className="font-semibold text-[var(--ec-text-primary)]">{subjectLabel}</span>.
      Keep marking — your insights, journey, and attempt history are tracked above.
    </div>
  )
  const topicsNode = masteryUnlocked ? (
    topicsInner
  ) : (
    <MasteryDashboardTeaser>{topicsInner}</MasteryDashboardTeaser>
  )

  const attemptsNode = <AttemptsList attempts={filteredRaw} />

  return (
    <main className="app-shell app-shell-tabbed">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="mb-10 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-entry">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] backdrop-blur transition-colors hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to dashboard
            </Link>
            <p className="ec-label-tech mb-4">PROGRESS</p>
            <h1 className="text-hero">
              <span className="gradient-text">
                {firstName ? `${firstName}'s` : 'Your'}
              </span>
              <br />
              <span className="ec-text-gradient">progress.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--ec-text-secondary)] sm:text-lg">
              Your diagnosis, your next move, and the map of how far you&rsquo;ve
              come — built from your marked {subjectLabel} attempts.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 py-1.5 font-mono text-xs font-medium text-[var(--ec-text-secondary)] backdrop-blur">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {lastUpdated}
          </div>
        </div>

        <ProgressSubjectPicker
          subjects={subjectOptions}
          selectedCode={selectedCode}
        />

        <ProgressTabs
          insights={insightsNode}
          journey={journeyNode}
          topics={topicsNode}
          attempts={attemptsNode}
        />
      </div>

      <DrillToast />

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
