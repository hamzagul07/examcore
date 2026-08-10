import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  type AttemptLite,
  type LeafMastery,
} from '@/lib/mastery'
import {
  getSubjectById,
  defaultSubjectsForProfile,
  defaultMarkSubjectCode,
} from '@/lib/profile-options'
import { usesLetterGradeBands } from '@/lib/target-grade'
import { getSyllabusByCode, getSyllabusSubjectName, hasSyllabusTree } from '@/lib/syllabi'
import { getAttemptSubjectCode } from '@/lib/syllabi/attempts'
import { BillingLimitBanner } from '@/components/billing/BillingLimitBanner'
import { buildContinueCatalog } from '@/lib/courses/margin-notes/continue-catalog'
import { DashboardCoursesPanel } from '@/components/courses/margin-notes/DashboardCoursesPanel'
import { DashboardEntry } from './dashboard.client'
import { buildReviewQueue } from '@/lib/courses/review-queue'
import { AppSupportStrip } from '@/components/marketing/AppSupportStrip'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { HomeHero } from '@/components/dashboard/HomeHero'
import { StudyNotebook } from '@/components/dashboard/StudyNotebook'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { NewUserHome } from '@/components/dashboard/NewUserHome'
import { NextActionCard } from '@/components/dashboard/NextActionCard'
import { DashboardSection } from '@/components/dashboard/DashboardSection'
import { computeStreak } from '@/lib/dashboard/streak'
import { MomentumStrip } from '@/components/dashboard/MomentumStrip'
import { buildMomentum } from '@/lib/dashboard/momentum'
import { GradeTargetTrack } from '@/components/dashboard/GradeTargetTrack'
import { buildGradeTarget } from '@/lib/dashboard/grade-target'
import { buildNextAction } from '@/lib/dashboard/next-action'
import { attemptsThisMonth, attemptsThisWeek, bestSubjectThisWeek } from '@/lib/dashboard/home-stats'
import { displaySubjectName } from '@/lib/dashboard/subject-display'
import { resolveDashboardState, type Recommendation } from '@/lib/insights/types'
import {
  fetchGenericRecommendations,
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
} from '@/lib/insights/recommendations'
import { truncateMarkingPreview } from '@/lib/rich-text/truncate-marking-preview'
import { effectiveAccess } from '@/lib/billing/access'
import { hasMaxResourceVault } from '@/lib/billing/features'
import { computeBillingSummary } from '@/lib/billing/enforcement'
import { MaxVaultTile } from '@/components/max/MaxVaultTile'
import { MaxUsageTheatre } from '@/components/max/MaxUsageTheatre'
import { MaxEarlyAccessBanner } from '@/components/max/MaxEarlyAccessBanner'
import { maybeGrantMaxSprintGift } from '@/lib/max/gifts'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function attemptLabel(attempt: {
  source_type: string
  question_text: string | null
  mark_schemes: unknown
}): string {
  const ms = attempt.mark_schemes as {
    question_number?: string | null
    paper_code?: string | null
  } | null
  if (attempt.source_type === 'past_paper' && ms) {
    return `Q${ms.question_number} — ${ms.paper_code}`
  }
  return `Custom: ${truncateMarkingPreview(attempt.question_text, 50, 'question')}`
}

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
    .select('full_name, level, subjects, exam_date, board, target_grade')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const greetingName = firstName || 'student'
  const examDate = (profile?.exam_date as string | null) ?? null

  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, source_type, question_text, created_at,
      syllabus_tags, time_spent_seconds, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const attemptsList = attempts || []
  const timestamps = attemptsList.map((a) => new Date(a.created_at))
  const streak = computeStreak(timestamps)
  const weeklyCount = attemptsThisWeek(timestamps)
  // Reuses the attempts already fetched above — no extra query for the strip.
  const momentum = buildMomentum(attemptsList, 14)
  // Recent form vs the target the student set — both already stored, never
  // previously shown together.
  const profileBoard = profile?.board ?? 'Cambridge International'
  const gradeTarget = buildGradeTarget({
    attempts: attemptsList,
    targetGrade: (profile?.target_grade as string | null) ?? null,
    examDate,
    usesLetterGrades: usesLetterGradeBands(profileBoard),
  })
  const monthlyCount = attemptsThisMonth(timestamps)
  const bestSubjectCode = bestSubjectThisWeek(attemptsList)
  const bestSubjectLabel = displaySubjectName(bestSubjectCode)

  const notebookRecent = attemptsList.slice(0, 3).map((attempt) => ({
    id: attempt.id,
    label: attemptLabel(attempt),
    marks_earned: attempt.marks_earned,
    total_marks: attempt.total_marks,
  }))

  const profileLevel = profile?.level ?? 'A-Level'
  const profileSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : defaultSubjectsForProfile(profileBoard, profileLevel)
  const subjectAttemptCounts = new Map<string, number>()
  for (const name of profileSubjects) {
    const subj = getSubjectById(name, profileLevel)
    const code = subj?.code
    const count = attemptsList.filter((a) => {
      const attemptCode = getAttemptSubjectCode(a)
      return code ? attemptCode === code : false
    }).length
    subjectAttemptCounts.set(name, count)
  }
  const activeSubjects = profileSubjects
    .filter((name) => (subjectAttemptCounts.get(name) ?? 0) > 0)
    .map((name) => ({
      name,
      code: getSubjectById(name, profileLevel)?.code ?? null,
    }))

  const profileSubjectChips = profileSubjects.map((name) => ({
    name,
    code: getSubjectById(name, profileLevel)?.code ?? null,
  }))

  let recommendations: Recommendation[] = []
  let continueSubjectLabel: string | null = null
  let masteries: LeafMastery[] = []

  const primarySubject = profileSubjects.find((name) => {
    const s = getSubjectById(name, profileLevel)
    return s?.markingEnabled && hasSyllabusTree(s.code)
  })
  const primaryCode = primarySubject
    ? getSubjectById(primarySubject, profileLevel)?.code
    : defaultMarkSubjectCode(profileLevel)

  if (primaryCode && attemptsList.length > 0) {
    const syllabus = getSyllabusByCode(primaryCode)
    if (syllabus?.length) {
      const filtered = attemptsList.filter(
        (a) => getAttemptSubjectCode(a) === primaryCode
      ) as AttemptLite[]
      masteries = flattenLeafMasteries(
        calculateParentMastery(filtered, primaryCode)
      )
      const state = resolveDashboardState(filtered.length)
      continueSubjectLabel =
        getSyllabusSubjectName(primaryCode) || primarySubject || null

      if (state === 'active') {
        const targets = topicTargetsFromMasteries(masteries, 3)
        recommendations = await fetchTopicRecommendations(supabaseAdmin, targets, 3)
      }
      if (recommendations.length === 0) {
        recommendations = await fetchGenericRecommendations(
          supabaseAdmin,
          primaryCode,
          continueSubjectLabel ?? 'Mathematics',
          3
        )
      }
    }
  } else if (primaryCode && attemptsList.length === 0) {
    continueSubjectLabel =
      getSyllabusSubjectName(primaryCode) || primarySubject || null
    recommendations = await fetchGenericRecommendations(
      supabaseAdmin,
      primaryCode,
      continueSubjectLabel ?? 'Mathematics',
      3
    )
  }

  const isEmpty = attemptsList.length === 0
  const continueCatalog = buildContinueCatalog()

  // Always built, even with no marked attempts: the queue now also surfaces
  // lessons whose quick check the student completed, and those students are
  // exactly the ones who used to see an empty review section forever.
  const reviewItems = await buildReviewQueue(user.id)
  const nextAction = buildNextAction({ reviewItems, recommendations })
  // Extra due items beyond the one promoted into nextAction.
  const moreReview = reviewItems.slice(1, 4)

  const { data: subRow } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', user.id)
    .maybeSingle()
  const access = effectiveAccess({
    tier: (subRow?.tier as SubscriptionTier) ?? 'free',
    status: (subRow?.status as SubscriptionStatus) ?? 'canceled',
  })
  const showMax = hasMaxResourceVault(access)
  let maxUsage: { used: number; remaining: number; cap: number } | null = null
  if (showMax) {
    await maybeGrantMaxSprintGift(supabaseAdmin, user.id, examDate)
    try {
      const summary = await computeBillingSummary(user.id, supabaseAdmin)
      maxUsage = {
        used: summary.questions.used,
        remaining: summary.questions.remaining,
        cap: summary.questions.cap,
      }
    } catch {
      maxUsage = null
    }
  }

  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded">
        <DashboardEntry>
          {isEmpty ? (
            <>
              {/* DB-01: first-mark CTA before any billing/approaching chrome. */}
              <NewUserHome
                subjects={profileSubjectChips}
                subjectLabel={continueSubjectLabel}
                recommendations={recommendations}
                board={profileBoard}
                firstName={greetingName}
              />
              <BillingLimitBanner className="mb-6 mt-6" />
              {showMax ? (
                <div className="mt-6 space-y-4 px-4 sm:px-0">
                  <MaxEarlyAccessBanner />
                  <MaxVaultTile />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <HomeHero
                firstName={greetingName}
                examDate={examDate}
                weeklyAttempts={weeklyCount}
                hideMarkCta
              />
              {/* DB-02: one server-computed next action, then weekly status. */}
              <NextActionCard action={nextAction} />
              <BillingLimitBanner className="mb-6" />
              {showMax ? (
                <div className="mb-6 space-y-4">
                  <MaxEarlyAccessBanner />
                  <MaxVaultTile />
                  {maxUsage ? (
                    <MaxUsageTheatre
                      used={maxUsage.used}
                      remaining={maxUsage.remaining}
                      cap={maxUsage.cap}
                    />
                  ) : null}
                </div>
              ) : null}
              <MomentumStrip summary={momentum} streak={streak} />

              <DashboardSection title="Continue learning" defaultOpen>
                <DashboardCoursesPanel catalog={continueCatalog} />
                <ContinueWork
                  recommendations={
                    nextAction.kind === 'drill'
                      ? recommendations.slice(1)
                      : recommendations
                  }
                  subjectLabel={continueSubjectLabel}
                />
              </DashboardSection>

              <DashboardSection title="Progress">
                {gradeTarget ? <GradeTargetTrack data={gradeTarget} /> : null}
                <StudyNotebook
                  monthlyAttempts={monthlyCount}
                  streak={streak}
                  bestSubjectLabel={bestSubjectLabel}
                  recentAttempts={notebookRecent}
                  recommendations={recommendations}
                  isEmpty={false}
                />
                {moreReview.length > 0 ? (
                  <section className="ms-review-slip mb-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                          RV
                        </span>
                        <div>
                          <p className="ec-eyebrow mb-0">More due</p>
                          <h3 className="text-lg font-bold text-[var(--ec-text-primary)]">
                            Other review items
                          </h3>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/review"
                        className="whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
                      >
                        See all -&gt;
                      </Link>
                    </div>
                    <ul className="ms-review-slip__list">
                      {moreReview.map((it) => (
                        <li key={`${it.subject}-${it.code}`}>
                          <Link href={it.practiceHref} className="ms-review-slip__row">
                            <span className="min-w-0 truncate text-sm font-medium text-[var(--ec-text-primary)]">
                              {it.name}{' '}
                              <span className="text-[var(--ec-text-secondary)]">· {it.subjectLabel}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--ec-brand)]">
                              Review -&gt;
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <ActiveSubjects subjects={activeSubjects} />
                <p className="text-caption text-center lg:text-left">
                  Want mastery matrix, journey timeline, and grade trajectory?{' '}
                  <Link href="/dashboard/progress" className="font-semibold text-[var(--ec-brand)]">
                    View detailed progress →
                  </Link>
                </p>
              </DashboardSection>
            </>
          )}
          <AppSupportStrip className="mt-10" />
        </DashboardEntry>
      </div>
      <OmniAIBridge
        context={{
          type: 'dashboard_home',
          data: {
            name: greetingName,
            streak,
            attemptCount: attemptsList.length,
          },
        }}
      />
    </main>
  )
}
