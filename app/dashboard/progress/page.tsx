import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

import {
  calculateParentMastery,
  calculateSyllabusCoverage,
  flattenLeafMasteries,
  type AttemptLite,
} from '@/lib/mastery'
import { predictGrade } from '@/lib/prediction'
import { generateActionPlan } from '@/lib/action-plan'
import { getSubjectById, defaultSubjectsForProfile } from '@/lib/profile-options'
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
import { getCourseCatalog, getCourseLessons } from '@/lib/courses'
import {
  adaptDashStats,
  adaptMilestone,
  adaptRecentMarks,
  adaptStreakWeek,
  adaptWeakFromRecommendations,
  adaptWeakTopics,
} from '@/lib/courses/margin-notes/adapt-progress'

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
import { BillingLimitBanner } from '@/components/billing/BillingLimitBanner'
import { MasteryDashboardTeaser } from '@/components/billing/MasteryDashboardTeaser'
import { isPaidTier } from '@/lib/billing/features'
import type { SubscriptionTier } from '@/lib/database.types'
import { ProgressDashboardPage } from '@/components/courses/margin-notes/ProgressDashboardPage'

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
    .select('full_name, subjects, level, board')
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
  const profileLevel = profile?.level ?? 'A-Level'
  const profileBoard = profile?.board ?? 'Cambridge International'
  const isIbProfile = profileBoard === 'IB'
  const userSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : defaultSubjectsForProfile(profileBoard, profileLevel)
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
    (isIbProfile ? 'ib-biology-hl' : '9709')

  const selectedCode =
    params.subject && subjectOptions.some((s) => s.code === params.subject)
      ? params.subject
      : defaultCode

  const selectedSubject = subjectOptions.find((s) => s.code === selectedCode)
  const isIbSubject = selectedCode.startsWith('ib-')
  const boardPrefix = isIbSubject || isIbProfile ? 'IB' : 'Cambridge'
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
    (isIbSubject || isIbProfile ? 'IB Diploma' : 'Cambridge A-Level')

  const displaySubjectLabel = isIbSubject
    ? subjectLabel
    : `${boardPrefix} ${selectedCode} ${subjectLabel}`

  const parentMasteries = analyticsAvailable
    ? calculateParentMastery(attempts, selectedCode)
    : []
  const masteries = flattenLeafMasteries(parentMasteries)
  const coverage = calculateSyllabusCoverage(masteries)
  const prediction = predictGrade(attempts, masteries)
  const streakDays = computeStreak(allAttempts.map((a) => new Date(a.created_at)))
  const totalTopics = getTotalSyllabusLeaves(selectedCode)
  const actionItems = generateActionPlan(attempts, masteries, streakDays, {
    subjectLabel: displaySubjectLabel,
    totalTopics: totalTopics || 38,
  })

  const state = resolveDashboardState(attempts.length)
  const patterns = analysePatterns(attempts)
  const speedProfile = analyseSpeedProfile(attempts)
  const wins = deriveWins(attempts, masteries, streakDays)
  const timelineStations = buildTimeline(attempts)

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

  const weakTopics =
    adaptWeakTopics(masteries, selectedCode).length > 0
      ? adaptWeakTopics(masteries, selectedCode)
      : adaptWeakFromRecommendations(recommendations, selectedCode)

  const topicsCovered = masteries.filter((m) => m.level !== 'unattempted').length

  const dashStats = adaptDashStats(
    allAttempts as AttemptLite[],
    topicsCovered,
    prediction,
    selectedCode
  )

  const weakTopicsForOmni = masteries
    .filter((m) => m.level === 'critical')
    .sort((a, b) => a.percentage - b.percentage)
    .map((m) => ({ code: m.code, name: m.name, percentage: m.percentage }))

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
        subjectLabel={`${boardPrefix} ${selectedCode} ${subjectLabel}`}
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
    <div className="card card-pad">
      <p className="body-2">
        {isIbSubject ? (
          <>
            Topic mastery matrix is syllabus-based for Cambridge subjects today. For{' '}
            <strong className="text-main">{subjectLabel}</strong>, your criterion marks
            are tracked in Insights, Journey, and Attempts below — topic-level mastery
            for IB is coming soon.
          </>
        ) : (
          <>
            Detailed topic analytics are coming soon for{' '}
            <strong className="text-main">{subjectLabel}</strong>. Keep marking — your
            insights, journey, and attempt history are tracked below.
          </>
        )}
      </p>
    </div>
  )
  const topicsNode = masteryUnlocked ? (
    topicsInner
  ) : (
    <MasteryDashboardTeaser>{topicsInner}</MasteryDashboardTeaser>
  )

  const attemptsNode = <AttemptsList attempts={filteredRaw} />

  const detailedSection = (
    <>
      <BillingLimitBanner className="mb-6" />
      <ProgressSubjectPicker subjects={subjectOptions} selectedCode={selectedCode} />
      <ProgressTabs
        insights={insightsNode}
        journey={journeyNode}
        topics={topicsNode}
        attempts={attemptsNode}
      />
    </>
  )

  const courseCatalog = getCourseCatalog().map((c) => ({
    code: c.code,
    name: c.name,
    lessonCount: getCourseLessons(c.code).length,
  }))

  return (
    <>
      <ProgressDashboardPage
        firstName={firstName ?? ''}
        streakDays={streakDays}
        streakWeek={adaptStreakWeek(allAttempts.map((a) => new Date(a.created_at)))}
        stats={dashStats}
        recent={adaptRecentMarks(allAttempts)}
        weakTopics={weakTopics}
        milestone={adaptMilestone(actionItems, heroInsight.body)}
        courseCatalog={courseCatalog}
        detailedSection={detailedSection}
      />
      <DrillToast />
      {analyticsAvailable ? (
        <OmniAIBridge
          context={{
            type: 'mastery_matrix',
            data: { weakTopics: weakTopicsForOmni, coverage },
          }}
        />
      ) : null}
    </>
  )
}
