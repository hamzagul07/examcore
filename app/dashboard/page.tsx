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
import { AppEmptyState } from '@/components/ui/AppEmptyState'
import { DashboardEntry } from './dashboard.client'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { HomeHero } from '@/components/dashboard/HomeHero'
import { RecentAttempts, type RecentAttempt } from '@/components/dashboard/RecentAttempts'
import { QuickStats } from '@/components/dashboard/QuickStats'
import { ContinueWork } from '@/components/dashboard/ContinueWork'
import { ActiveSubjects } from '@/components/dashboard/ActiveSubjects'
import { computeStreak } from '@/lib/dashboard/streak'
import {
  attemptsThisWeek,
  attemptsThisMonth,
  bestSubjectThisWeek,
} from '@/lib/dashboard/home-stats'
import { resolveDashboardState, type Recommendation } from '@/lib/insights/types'
import {
  fetchGenericRecommendations,
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
} from '@/lib/insights/recommendations'
import type { SyllabusCode } from '@/lib/syllabus'

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
    .limit(50)

  const attemptsList = attempts || []
  const timestamps = attemptsList.map((a) => new Date(a.created_at))
  const streak = computeStreak(timestamps)
  const weeklyCount = attemptsThisWeek(timestamps)
  const monthlyCount = attemptsThisMonth(timestamps)
  const bestSubject = bestSubjectThisWeek(attemptsList)

  const uniqueTopics = new Set<SyllabusCode>()
  for (const a of attemptsList) {
    const tags = (a as { syllabus_tags?: string[] | null }).syllabus_tags
    if (tags?.length) {
      for (const t of tags) uniqueTopics.add(t as SyllabusCode)
    }
  }

  const recentRows: RecentAttempt[] = attemptsList.slice(0, 5).map((attempt) => {
    const percentage = Math.round((attempt.marks_earned / attempt.total_marks) * 100)
    const ms = attempt.mark_schemes as {
      question_number?: string | null
      paper_code?: string | null
      paper_session?: string | null
    } | null
    const label =
      attempt.source_type === 'past_paper' && ms
        ? `Q${ms.question_number} — ${ms.paper_code}`
        : `Custom: ${(attempt.question_text || '').substring(0, 50)}${
            (attempt.question_text || '').length > 50 ? '…' : ''
          }`
    return {
      id: attempt.id,
      marks_earned: attempt.marks_earned,
      total_marks: attempt.total_marks,
      source_type: attempt.source_type,
      question_text: attempt.question_text,
      created_at: attempt.created_at,
      label,
      dateStr: new Date(attempt.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      percentage,
    }
  })

  // Subject chips: count attempts per profile subject
  const profileSubjects: string[] = profile?.subjects?.length
    ? profile.subjects
    : ['Mathematics']
  const subjectAttemptCounts = new Map<string, number>()
  for (const name of profileSubjects) {
    const subj = getSubjectById(name)
    const code = subj?.code
    const count = attemptsList.filter((a) => {
      const ms = a.mark_schemes as { paper_code?: string | null } | null
      const attemptCode = ms?.paper_code?.split('/')[0]
      return code ? attemptCode === code : false
    }).length
    subjectAttemptCounts.set(name, count)
  }
  const activeSubjects = profileSubjects
    .filter((name) => (subjectAttemptCounts.get(name) ?? 0) > 0)
    .map((name) => ({
      name,
      code: getSubjectById(name)?.code ?? null,
      attemptCount: subjectAttemptCounts.get(name) ?? 0,
    }))

  // Recommendations from primary math/syllabus subject
  let recommendations: Recommendation[] = []
  let continueSubjectLabel: string | null = null

  const primarySubject = profileSubjects.find((name) => {
    const s = getSubjectById(name)
    return s?.markingEnabled && hasSyllabusTree(s.code)
  })
  const primaryCode = primarySubject ? getSubjectById(primarySubject)?.code : '9709'

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
    <main className="app-shell app-shell-tabbed">
      <div className="mx-auto max-w-7xl">
        <DashboardEntry>
          <HomeHero
            firstName={greetingName}
            examDate={examDate}
            weeklyAttempts={weeklyCount}
          />

          {isEmpty ? (
            <AppEmptyState
              title="Ready when you are"
              body="Mark your first question to start seeing your progress here."
              ctaLabel="Mark your first question"
              ctaHref="/mark"
            />
          ) : (
            <>
              <RecentAttempts attempts={recentRows} />
              <QuickStats
                monthlyAttempts={monthlyCount}
                streak={streak}
                bestSubjectCode={bestSubject}
                topicsAttempted={uniqueTopics.size}
              />
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
