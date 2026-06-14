import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  type AttemptLite,
} from '@/lib/mastery'
import { getSubjectById } from '@/lib/profile-options'
import { getSyllabusByCode, getSyllabusSubjectName, hasSyllabusTree } from '@/lib/syllabi'
import { getAttemptSubjectCode } from '@/lib/syllabi/attempts'
import { BillingLimitBanner } from '@/components/billing/BillingLimitBanner'
import { DashboardEntry } from './dashboard.client'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { HomeHero } from '@/components/dashboard/HomeHero'
import { StudyNotebook } from '@/components/dashboard/StudyNotebook'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { computeStreak } from '@/lib/dashboard/streak'
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
    .select('full_name, level, subjects, exam_date')
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
  const monthlyCount = attemptsThisMonth(timestamps)
  const bestSubjectCode = bestSubjectThisWeek(attemptsList)
  const bestSubjectLabel = displaySubjectName(bestSubjectCode)

  const notebookRecent = attemptsList.slice(0, 3).map((attempt) => ({
    id: attempt.id,
    label: attemptLabel(attempt),
    marks_earned: attempt.marks_earned,
    total_marks: attempt.total_marks,
  }))

  const profileSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : ['Mathematics']
  const profileLevel = profile?.level ?? 'A-Level'
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

  let recommendations: Recommendation[] = []
  let continueSubjectLabel: string | null = null

  const primarySubject = profileSubjects.find((name) => {
    const s = getSubjectById(name, profileLevel)
    return s?.markingEnabled && hasSyllabusTree(s.code)
  })
  const primaryCode = primarySubject
    ? getSubjectById(primarySubject, profileLevel)?.code
    : profileLevel === 'O-Level'
      ? '4024'
      : '9709'

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
  }

  const isEmpty = attemptsList.length === 0

  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded-2xl">
        <DashboardEntry>
          <HomeHero
            firstName={greetingName}
            examDate={examDate}
            weeklyAttempts={weeklyCount}
          />

          <BillingLimitBanner className="mb-6" />

          <StudyNotebook
            monthlyAttempts={monthlyCount}
            streak={streak}
            bestSubjectLabel={bestSubjectLabel}
            recentAttempts={notebookRecent}
            recommendations={recommendations}
            isEmpty={isEmpty}
          />

          {!isEmpty && (
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <ContinueWork
                recommendations={recommendations}
                subjectLabel={continueSubjectLabel}
              />
              <ActiveSubjects subjects={activeSubjects} />
            </div>
          )}

          {!isEmpty && (
            <p className="text-caption text-center lg:text-left">
              Want mastery matrix, journey timeline, and grade trajectory?{' '}
              <Link href="/dashboard/progress" className="font-semibold text-[var(--ec-brand)]">
                View detailed progress →
              </Link>
            </p>
          )}
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
