import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  type AttemptLite,
} from '@/lib/mastery'
import { getSubjectById, defaultSubjectsForProfile, defaultMarkSubjectCode } from '@/lib/profile-options'
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
import { WeakSpotDrillCard } from '@/components/insights/WeakSpotDrillCard'
import { StudyNotebook } from '@/components/dashboard/StudyNotebook'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { NewUserHome } from '@/components/dashboard/NewUserHome'
import { computeStreak } from '@/lib/dashboard/streak'
import { MomentumStrip } from '@/components/dashboard/MomentumStrip'
import { buildMomentum } from '@/lib/dashboard/momentum'
import { attemptsThisMonth, attemptsThisWeek, bestSubjectThisWeek } from '@/lib/dashboard/home-stats'
import { displaySubjectName } from '@/lib/dashboard/subject-display'
import { resolveDashboardState, type Recommendation } from '@/lib/insights/types'
import {
  fetchGenericRecommendations,
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
} from '@/lib/insights/recommendations'

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
  const text = attempt.question_text || ''
  return `Custom: ${text.substring(0, 50)}${text.length > 50 ? '…' : ''}`
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
    .select('full_name, level, subjects, exam_date, board')
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
  const profileBoard = profile?.board ?? 'Cambridge International'
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
      const masteries = flattenLeafMasteries(
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

  const reviewItems = isEmpty ? [] : await buildReviewQueue(user.id)

  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded-2xl">
        <DashboardEntry>
          <HomeHero
            firstName={greetingName}
            examDate={examDate}
            weeklyAttempts={weeklyCount}
            hideMarkCta={isEmpty}
          />

          <BillingLimitBanner className="mb-6" />

          {/* Above the fold, before anything asks them to do more work: have I
              shown up? The strip returns null when the fortnight is empty, so a
              brand-new account isn't greeted by a row of zeroes. */}
          {!isEmpty ? (
            <MomentumStrip summary={momentum} streak={streak} />
          ) : null}

          {!isEmpty ? (
            <WeakSpotDrillCard
              title="Practice your weakest spot"
              className="mb-6"
            />
          ) : null}

          <DashboardCoursesPanel catalog={continueCatalog} />

          {!isEmpty ? (
            <StudyNotebook
              monthlyAttempts={monthlyCount}
              streak={streak}
              bestSubjectLabel={bestSubjectLabel}
              recentAttempts={notebookRecent}
              recommendations={recommendations}
              isEmpty={false}
            />
          ) : null}

          {!isEmpty ? (
            <section className="ec-card mb-6 p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="ec-eyebrow mb-1">Spaced review</p>
                  <h2 className="text-lg font-bold text-[var(--ec-text-primary)]">
                    Review your misses
                  </h2>
                </div>
                <Link
                  href="/dashboard/review"
                  className="whitespace-nowrap text-sm font-semibold text-[var(--ec-brand)]"
                >
                  {reviewItems.length > 0 ? 'See all →' : 'Open →'}
                </Link>
              </div>
              {reviewItems.length === 0 ? (
                <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  You&apos;re caught up — nothing due right now. Your predicted grade,
                  mark-losing pattern and full review plan live here.
                </p>
              ) : (
              <ul className="flex flex-col gap-2">
                {reviewItems.slice(0, 3).map((it) => (
                  <li key={`${it.subject}-${it.code}`}>
                    <Link
                      href={it.practiceHref}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ec-border)] px-3 py-2 transition-colors hover:border-[color-mix(in_srgb,var(--ec-brand)_50%,var(--ec-border))]"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-[var(--ec-text-primary)]">
                        {it.name}{' '}
                        <span className="text-[var(--ec-text-faint)]">· {it.subjectLabel}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--ec-brand)]">
                        Review →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              )}
            </section>
          ) : null}

          {isEmpty ? (
            <NewUserHome
              subjects={profileSubjectChips}
              subjectLabel={continueSubjectLabel}
              recommendations={recommendations}
            />
          ) : (
            <>
              <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                <ContinueWork
                  recommendations={recommendations}
                  subjectLabel={continueSubjectLabel}
                />
                <ActiveSubjects subjects={activeSubjects} />
              </div>

              <p className="text-caption text-center lg:text-left">
                Want mastery matrix, journey timeline, and grade trajectory?{' '}
                <Link href="/dashboard/progress" className="font-semibold text-[var(--ec-brand)]">
                  View detailed progress →
                </Link>
              </p>
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
