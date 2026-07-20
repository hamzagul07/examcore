import { sendEmailAsync } from '@/lib/email/send'
import { renderBrandedEmailHtml } from '@/lib/email/templates'
import { topicDrillHref } from '@/lib/insights/drill-link'
import { SITE_URL } from '@/lib/site-config'

/** One weak topic to drill, with a deep link into the practice flow. */
export type WeeklyWeakTopic = {
  name: string
  subjectLabel: string | null
  subjectCode: string
  topicCode: string
  percentage: number
}

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
  /** Up to 3 weakest topics — the "fix these" list. */
  weakTopics: WeeklyWeakTopic[]
  examDaysLeft: number | null
}

const BRAND = '#9f1239'
const INK = '#1a1a1a'
const MUTED = '#8a7f70'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function deltaBadge(delta: number | null): string {
  if (delta === null || Math.abs(delta) < 1) return ''
  const up = delta > 0
  const n = Math.round(Math.abs(delta))
  const color = up ? '#2f7d4f' : '#b4413b'
  return ` <span style="font-size:12px;font-weight:700;color:${color}">${up ? '▲' : '▼'}${n}%</span>`
}

function statCell(big: string, label: string, accent = INK): string {
  return `<td valign="top" style="padding:0 4px;width:33.33%">
    <div style="background:#faf7f2;border:1px solid #eee2d6;border-radius:12px;padding:14px 6px;text-align:center">
      <div style="font-size:24px;font-weight:800;color:${accent};line-height:1.1">${big}</div>
      <div style="font-size:10.5px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;margin-top:5px">${esc(label)}</div>
    </div></td>`
}

/** Build the rich HTML body (inside the branded card). */
function buildBodyHtml(greeting: string, d: WeeklyReportData): string {
  const parts: string[] = []

  parts.push(
    `<p style="margin:0 0 4px;font-size:16px;color:${INK}">Hi ${esc(greeting)},</p>`,
    `<p style="margin:0 0 20px;font-size:15px;color:#555">Here's your week in review — and the one move that'll move your grade. 👇</p>`
  )

  // Stat row
  const avg = d.avgPctThisWeek !== null ? `${Math.round(d.avgPctThisWeek)}%` : '—'
  parts.push(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
      statCell(String(d.marksThisWeek), 'marked this week') +
      statCell(`${avg}${deltaBadge(d.avgPctDelta)}`, 'your average') +
      statCell(d.predictedGrade ?? '—', 'on current form', d.predictedGrade ? BRAND : INK) +
      `</tr></table>`
  )

  // Grade / target callout
  if (d.predictedGrade) {
    const subject = d.primarySubjectLabel ? ` in ${esc(d.primarySubjectLabel)}` : ''
    let inner: string
    if (d.targetGrade && d.onTrackForTarget) {
      inner = `You're <strong style="color:${BRAND}">on track for your target ${esc(d.targetGrade)}</strong>${subject}. Hold the line — keep marking to stay sharp.`
    } else if (d.targetGrade && d.pointsToTarget !== null) {
      inner = `You're tracking <strong>${esc(d.predictedGrade)}</strong>${subject}. Your target is <strong style="color:${BRAND}">${esc(d.targetGrade)}</strong> — about <strong>${d.pointsToTarget}%</strong> to close. That's a handful of marks in the right places.`
    } else {
      inner = `You're tracking <strong>${esc(d.predictedGrade)}</strong>${subject}. <a href="${esc(SITE_URL)}/account/exam" style="color:${BRAND};font-weight:700">Set a target grade →</a> and we'll show you exactly how far you have to go.`
    }
    parts.push(
      `<div style="background:linear-gradient(135deg,#fdf2f4,#faf7f2);border:1px solid #f0d9df;border-radius:14px;padding:16px 18px;margin:0 0 22px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND};font-weight:800;margin-bottom:6px">📈 Grade trajectory</div>
        <div style="font-size:15px;line-height:1.55;color:#333">${inner}</div>
      </div>`
    )
  }

  // Weak spots — "fix these" list (the hook)
  if (d.weakTopics.length > 0) {
    const rows = d.weakTopics
      .map((t) => {
        const href = `${SITE_URL}${topicDrillHref(t.subjectCode, t.topicCode)}`
        const sub = t.subjectLabel ? `<span style="color:${MUTED}"> · ${esc(t.subjectLabel)}</span>` : ''
        return `<tr>
          <td style="padding:11px 0;border-bottom:1px solid #f0ece4">
            <span style="font-size:15px;font-weight:600;color:${INK}">${esc(t.name)}</span>${sub}
            <div style="font-size:12px;color:${MUTED};margin-top:2px">currently ${t.percentage}% — your biggest mark gap</div>
          </td>
          <td align="right" style="padding:11px 0;border-bottom:1px solid #f0ece4;white-space:nowrap">
            <a href="${esc(href)}" style="color:${BRAND};font-weight:700;text-decoration:none;font-size:14px">Drill it →</a>
          </td>
        </tr>`
      })
      .join('')
    parts.push(
      `<div style="font-size:17px;font-weight:800;color:${INK};margin:0 0 4px">🎯 Fix these before they cost you in the exam</div>
       <div style="font-size:13px;color:#666;margin:0 0 10px">These topics are quietly leaking marks. One focused session each closes the gap.</div>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
       <p style="margin:12px 0 22px;font-size:13px"><a href="${esc(SITE_URL)}/dashboard" style="color:${BRAND};font-weight:700">See all your weak spots →</a></p>`
    )
  } else {
    parts.push(
      `<div style="background:#faf7f2;border:1px solid #eee2d6;border-radius:12px;padding:14px 16px;margin:0 0 22px;font-size:14px;color:#555">
        No confirmed weak spots yet — a few more marked questions and we'll pinpoint exactly where your marks are hiding.
      </div>`
    )
  }

  // Exam countdown
  if (d.examDaysLeft !== null) {
    const urgent = d.examDaysLeft <= 30
    parts.push(
      `<div style="display:inline-block;background:${urgent ? '#fdecea' : '#f6f4f0'};border:1px solid ${urgent ? '#f3c9c3' : '#e8e4dc'};border-radius:999px;padding:8px 16px;margin:0 0 20px;font-size:14px;font-weight:700;color:${urgent ? '#b4413b' : INK}">
        🗓 ${d.examDaysLeft} ${d.examDaysLeft === 1 ? 'day' : 'days'} until your exam${urgent ? ' — every session counts now' : ''}
      </div>`
    )
  }

  // Closing hook — grounded in their own numbers
  const hook =
    d.marksThisWeek === 0
      ? "You didn't mark anything this week. Grades move with reps — even three questions will get your trajectory climbing again."
      : d.marksThisWeek < 3
        ? `You marked ${d.marksThisWeek} ${d.marksThisWeek === 1 ? 'question' : 'questions'} this week. A couple more targeted drills and your average starts to bend upward — the students who move grades are the ones who show up little and often.`
        : `Strong week — ${d.marksThisWeek} questions in. Keep the streak alive and your trajectory keeps climbing.`
  parts.push(`<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#333">${hook}</p>`)

  return parts.join('\n')
}

/** Plain-text fallback (deliverability + clients that block HTML). */
function buildText(
  greeting: string,
  d: WeeklyReportData,
  dashboardUrl: string,
  unsubscribeHref: string
): string {
  const lines: string[] = [`Hi ${greeting},`, '', 'Your week in review:']
  const avg = d.avgPctThisWeek !== null ? ` at a ${Math.round(d.avgPctThisWeek)}% average` : ''
  lines.push(`- Marked ${d.marksThisWeek} question${d.marksThisWeek === 1 ? '' : 's'} this week${avg}.`)
  if (d.predictedGrade) {
    lines.push(
      d.targetGrade
        ? `- Tracking ${d.predictedGrade}${d.primarySubjectLabel ? ` in ${d.primarySubjectLabel}` : ''}; target ${d.targetGrade}${d.pointsToTarget !== null ? ` (${d.pointsToTarget}% to go)` : d.onTrackForTarget ? ' — on track' : ''}.`
        : `- Tracking ${d.predictedGrade}${d.primarySubjectLabel ? ` in ${d.primarySubjectLabel}` : ''}. Set a target grade to see how far you have to go.`
    )
  }
  if (d.weakTopics.length > 0) {
    lines.push('', 'Fix these before the exam:')
    for (const t of d.weakTopics) {
      lines.push(
        `- ${t.name}${t.subjectLabel ? ` (${t.subjectLabel})` : ''} — ${t.percentage}%: ${SITE_URL}${topicDrillHref(t.subjectCode, t.topicCode)}`
      )
    }
  }
  if (d.examDaysLeft !== null) {
    lines.push('', `${d.examDaysLeft} day${d.examDaysLeft === 1 ? '' : 's'} until your exam.`)
  }
  lines.push(
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    `Unsubscribe from weekly reports: ${unsubscribeHref}`,
    '',
    '— Your MarkScheme examiner'
  )
  return lines.join('\n')
}

/**
 * The premium private-tutor weekly report email. Fire-and-forget. Always includes
 * the one-click unsubscribe link (kind 'weekly').
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

  const primaryCta =
    data.weakTopics.length > 0
      ? { label: 'Practice your weak spots →', href: dashboardUrl }
      : { label: 'Open your dashboard →', href: dashboardUrl }

  const preheader = data.weakestTopicName
    ? `This week's fix: ${data.weakestTopicName}.`
    : 'Your progress this week — and your next move.'

  const bodyHtml =
    buildBodyHtml(greeting, data) +
    `<p style="margin:22px 0 0;font-size:15px;color:${INK}">— Your MarkScheme examiner</p>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#999"><a href="${esc(unsubscribeHref)}" style="color:#999">Unsubscribe from weekly reports</a></p>`

  const html = renderBrandedEmailHtml({ preheader, bodyHtml, cta: primaryCta })

  sendEmailAsync({
    to,
    subject: 'Your week in review 📈',
    preheader,
    text: buildText(greeting, data, dashboardUrl, unsubscribeHref),
    html,
  })
}
