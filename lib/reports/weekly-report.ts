import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'
import { calculateMastery, type AttemptLite } from '@/lib/mastery'
import { predictGrade } from '@/lib/prediction'
import { topicTargetsFromMasteries } from '@/lib/insights/recommendations'
import { gapToTargetGrade } from '@/lib/target-grade'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { getSubjectByCode } from '@/lib/profile-options'
import { getSyllabusByCode, getSyllabusSubjectName } from '@/lib/syllabi'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import {
  sendWeeklyReportEmail,
  type WeeklyReportData,
} from '@/lib/email/weekly-report'

// Weekly cron + this guard = at most one report per user per ~week.
const DEDUP_MS = 6 * 24 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Real emails go out only when explicitly enabled — ships OFF (dry-run). */
function emailsEnabled(): boolean {
  return process.env.WEEKLY_REPORT_SEND === 'true'
}

function subjectLabel(code: string): string | null {
  return getSubjectByCode(code)?.label ?? getSyllabusSubjectName(code) ?? null
}

function average(rows: AttemptLite[]): number | null {
  const valid = rows.filter((a) => a.total_marks > 0)
  if (!valid.length) return null
  return (
    valid.reduce((s, a) => s + (a.marks_earned / a.total_marks) * 100, 0) /
    valid.length
  )
}

/** Pure: turn a user's recent attempts + profile into the report figures. */
export function computeWeeklyReportData(
  attempts: AttemptWithPaper[],
  profile: { target_grade: string | null; exam_date: string | null }
): WeeklyReportData {
  const lite = attempts as unknown as AttemptLite[]
  const now = Date.now()
  const inWindow = (a: AttemptLite, lo: number, hi: number) => {
    const t = new Date(a.created_at).getTime()
    return t >= lo && t < hi
  }
  const weekAttempts = lite.filter((a) => inWindow(a, now - WEEK_MS, now + 1))
  const priorAttempts = lite.filter((a) =>
    inWindow(a, now - 2 * WEEK_MS, now - WEEK_MS)
  )
  const avgThis = average(weekAttempts)
  const avgPrior = average(priorAttempts)

  // Primary subject = most-attempted overall.
  const countBySubject = new Map<string, number>()
  for (const a of attempts) {
    const c = getAttemptSubjectCode(a)
    if (c) countBySubject.set(c, (countBySubject.get(c) ?? 0) + 1)
  }
  let primary: string | null = null
  let bestCount = 0
  for (const [c, n] of countBySubject) {
    if (n > bestCount) {
      bestCount = n
      primary = c
    }
  }

  let primarySubjectLabel: string | null = null
  let predictedGrade: string | null = null
  let pointsToTarget: number | null = null
  let onTrackForTarget = false
  if (primary) {
    primarySubjectLabel = subjectLabel(primary)
    if (getSyllabusByCode(primary)?.length) {
      const subjectAttempts = attempts.filter(
        (a) => getAttemptSubjectCode(a) === primary
      ) as unknown as AttemptLite[]
      const masteries = calculateMastery(subjectAttempts, primary)
      const prediction = predictGrade(subjectAttempts, masteries)
      // Cambridge only — IB isn't graded on these letter boundaries.
      if (!isIbSubjectCode(primary) && prediction.predictedGrade !== '—') {
        predictedGrade = prediction.predictedGrade
        const gap = gapToTargetGrade(
          prediction.averagePercentage,
          profile.target_grade
        )
        if (gap) {
          onTrackForTarget = gap.onTrack
          pointsToTarget = gap.onTrack ? 0 : gap.pointsToGo
        }
      }
    }
  }

  // Weakest topics across every treed subject the student has marked.
  const ranked: Array<{
    subject: string
    code: string
    name: string
    percentage: number
  }> = []
  for (const [subject] of countBySubject) {
    if (!getSyllabusByCode(subject)?.length) continue
    const subjectAttempts = attempts.filter(
      (a) => getAttemptSubjectCode(a) === subject
    ) as unknown as AttemptLite[]
    const leaves = calculateMastery(subjectAttempts, subject)
    const pctByCode = new Map(leaves.map((l) => [l.code, l.percentage]))
    for (const t of topicTargetsFromMasteries(leaves)) {
      ranked.push({
        subject,
        code: t.code,
        name: t.name,
        percentage: pctByCode.get(t.code) ?? 100,
      })
    }
  }
  ranked.sort((a, b) => a.percentage - b.percentage)
  const weakest = ranked[0] ?? null
  const weakTopics = ranked.slice(0, 3).map((r) => ({
    name: r.name,
    subjectLabel: subjectLabel(r.subject),
    subjectCode: r.subject,
    topicCode: r.code,
    percentage: Math.round(r.percentage),
  }))

  const countdown = examCountdown(profile.exam_date)

  return {
    marksThisWeek: weekAttempts.length,
    avgPctThisWeek: avgThis,
    avgPctDelta: avgThis !== null && avgPrior !== null ? avgThis - avgPrior : null,
    primarySubjectLabel,
    predictedGrade,
    targetGrade: profile.target_grade,
    pointsToTarget,
    onTrackForTarget,
    weakestTopicName: weakest?.name ?? null,
    weakestSubjectLabel: weakest ? subjectLabel(weakest.subject) : null,
    weakTopics,
    examDaysLeft: countdown.kind === 'future' ? countdown.daysLeft : null,
  }
}

/**
 * Weekly examiner report for PREMIUM users. Computes each report; sends email
 * only when WEEKLY_REPORT_SEND=true (otherwise logs a dry-run line). Opt-out is
 * `email_weekly_report` + the one-click `weekly` unsubscribe token.
 */
export async function sendWeeklyReportBatch(): Promise<{
  sent: number
  considered: number
  skipped: number
}> {
  const admin = createServiceClient()
  const nowIso = new Date().toISOString()
  const dedupCutoff = new Date(Date.now() - DEDUP_MS).toISOString()

  const { data: subs } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, status')
    .neq('tier', 'free')
    .in('status', ['active', 'trialing', 'past_due'])

  let sent = 0
  let considered = 0
  let skipped = 0

  for (const sub of subs ?? []) {
    const userId = sub.user_id as string

    // select * so the new opt-out/dedup columns being absent (migration not yet
    // applied) doesn't error the whole batch.
    const { data: profile } = await admin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!profile) {
      skipped++
      continue
    }
    if (profile.email_weekly_report === false) {
      skipped++
      continue
    }
    const lastSent = profile.weekly_report_last_sent_at as string | null | undefined
    if (lastSent && lastSent > dedupCutoff) {
      skipped++
      continue
    }

    const { data: rawAttempts } = await admin
      .from('attempts')
      .select(
        'id, marks_earned, total_marks, syllabus_tags, created_at, mark_schemes ( paper_code )'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)

    const attempts = (rawAttempts || []) as unknown as AttemptWithPaper[]
    if (attempts.length === 0) {
      skipped++
      continue
    }

    considered++
    const data = computeWeeklyReportData(attempts, {
      target_grade: (profile.target_grade as string | null) ?? null,
      exam_date: (profile.exam_date as string | null) ?? null,
    })

    if (emailsEnabled()) {
      const { data: authData } = await admin.auth.admin.getUserById(userId)
      const email = authData?.user?.email
      if (email) {
        sendWeeklyReportEmail({
          to: email,
          recipientName: (profile.full_name as string | null) ?? null,
          data,
          unsubscribeHref: unsubscribeUrl(userId, 'weekly'),
        })
        sent++
      }
    } else {
      console.log(
        '[weekly-report] dry-run — would send to',
        userId,
        JSON.stringify(data)
      )
    }

    // Best-effort dedup stamp (column may be absent pre-migration).
    await admin
      .from('user_profiles')
      .update({ weekly_report_last_sent_at: nowIso })
      .eq('id', userId)
  }

  return { sent, considered, skipped }
}
