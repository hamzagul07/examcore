import { sendEmailAsync } from '@/lib/email/send'
import { SITE_URL } from '@/lib/site-config'

/** The computed figures for one student's weekly examiner report. */
export type WeeklyReportData = {
  marksThisWeek: number
  avgPctThisWeek: number | null
  /** Change in average vs the prior 7 days (percentage points), if both exist. */
  avgPctDelta: number | null
  primarySubjectLabel: string | null
  /** Cambridge letter estimate, if the primary subject is Cambridge with data. */
  predictedGrade: string | null
  targetGrade: string | null
  /** % points from current form to the target (null unless Cambridge + target). */
  pointsToTarget: number | null
  onTrackForTarget: boolean
  weakestTopicName: string | null
  weakestSubjectLabel: string | null
  examDaysLeft: number | null
}

function deltaPhrase(delta: number | null): string {
  if (delta === null || Math.abs(delta) < 1) return ''
  const rounded = Math.round(delta)
  return rounded > 0 ? ` (up ${rounded}%)` : ` (down ${Math.abs(rounded)}%)`
}

/**
 * The private-tutor weekly report email. Fire-and-forget. Always includes the
 * one-click unsubscribe link (kind 'weekly').
 */
export function sendWeeklyReportEmail(payload: {
  to: string
  recipientName?: string | null
  data: WeeklyReportData
  unsubscribeHref: string
}): void {
  const { to, recipientName, data, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || 'there'
  const dashboardUrl = `${SITE_URL}/dashboard`

  const lines: string[] = [`Hi ${greeting},`, '']

  if (data.marksThisWeek > 0) {
    const avg =
      data.avgPctThisWeek !== null
        ? ` at a ${Math.round(data.avgPctThisWeek)}% average${deltaPhrase(data.avgPctDelta)}`
        : ''
    lines.push(
      `This week you marked ${data.marksThisWeek} ${data.marksThisWeek === 1 ? 'question' : 'questions'}${avg}. Here's where you stand.`
    )
  } else {
    lines.push(
      "You didn't mark anything this week — a few questions is all it takes to keep your momentum and your predicted grade current."
    )
  }
  lines.push('')

  if (data.predictedGrade && data.targetGrade) {
    if (data.onTrackForTarget) {
      lines.push(
        `📈 You're on track for your target ${data.targetGrade}${data.primarySubjectLabel ? ` in ${data.primarySubjectLabel}` : ''} — currently tracking ${data.predictedGrade}. Keep it up.`
      )
    } else if (data.pointsToTarget !== null) {
      lines.push(
        `📈 You're tracking ${data.predictedGrade}${data.primarySubjectLabel ? ` in ${data.primarySubjectLabel}` : ''} — target ${data.targetGrade}, about ${data.pointsToTarget}% to go.`
      )
    }
    lines.push('')
  } else if (data.predictedGrade && data.primarySubjectLabel) {
    lines.push(
      `📈 You're tracking ${data.predictedGrade} in ${data.primarySubjectLabel}. Set a target grade in your account to see exactly how far you have to go.`
    )
    lines.push('')
  }

  if (data.weakestTopicName) {
    lines.push(
      `🎯 Your weakest spot right now is ${data.weakestTopicName}${data.weakestSubjectLabel ? ` (${data.weakestSubjectLabel})` : ''}. Drilling it this week is the single biggest mark gain available to you — your dashboard has a one-tap practice for it.`
    )
    lines.push('')
  }

  if (data.examDaysLeft !== null) {
    lines.push(
      data.examDaysLeft <= 0
        ? '📅 Your exam is here — best of luck. You have put in the work.'
        : `📅 ${data.examDaysLeft} ${data.examDaysLeft === 1 ? 'day' : 'days'} until your exam.`
    )
    lines.push('')
  }

  lines.push(`Open your dashboard: ${dashboardUrl}`)
  lines.push('')
  lines.push(`Unsubscribe from weekly reports: ${unsubscribeHref}`)
  lines.push('')
  lines.push('— Your MarkScheme examiner')

  sendEmailAsync({
    to,
    subject: 'Your week in review',
    preheader:
      data.weakestTopicName
        ? `This week's focus: ${data.weakestTopicName}.`
        : 'Your progress this week.',
    text: lines.join('\n'),
    cta: { label: 'Open your dashboard', href: dashboardUrl },
  })
}
