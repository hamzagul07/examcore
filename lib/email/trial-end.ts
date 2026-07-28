import { sendEmailAsync } from '@/lib/email/send'
import { renderBrandedEmailHtml } from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'
import type { TrialSummary } from '@/lib/billing/trial-summary'

/**
 * The trial email — the dashboard panel's twin, for the student who doesn't
 * come back on their own.
 *
 * Same three rules as the panel (see TrialSummaryPanel): nothing is deleted and
 * the copy never implies it is, the numbers are the student's own and exact,
 * and declining is unpunished. The subject lines lead with what they keep, not
 * with a threat — "your marking is about to stop" is the sentence that gets a
 * 17-year-old's parent to reply to the wrong person.
 *
 * Two phases: 'ending_soon' goes out while they still hold the thing (which is
 * both the honest order and the one that converts), 'just_ended' the morning
 * after.
 */

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

function statCell(big: string, label: string, accent = INK): string {
  return `<td valign="top" style="padding:0 4px;width:33.33%">
    <div style="background:#faf7f2;border:1px solid #eee2d6;border-radius:12px;padding:14px 6px;text-align:center">
      <div style="font-size:24px;font-weight:800;color:${accent};line-height:1.1">${esc(big)}</div>
      <div style="font-size:10.5px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;margin-top:5px">${esc(label)}</div>
    </div></td>`
}

function pauseRow(text: string): string {
  return `<tr><td style="padding:9px 0;border-bottom:1px solid #f0ece4;font-size:14.5px;color:#444;line-height:1.5">${text}</td></tr>`
}

/** The list of what goes dormant. Identical in substance to the in-app panel —
 * if these ever drift, the student catches it and stops believing both. */
function pauseListHtml(d: TrialSummary): string {
  const rows = [
    pauseRow('Your examiner&rsquo;s report stops arriving on Sundays.'),
    pauseRow(
      d.weakest
        ? `<strong style="color:${INK}">${esc(d.weakest.name)}</strong> stays on your list &mdash; the drills that close it stop being generated.`
        : 'Weak topics keep being tracked; the drills that close them stop.'
    ),
    pauseRow('Second-opinion marking goes back to the first 3 questions of a script.'),
  ].join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rows}</table>`
}

function buildBodyHtml(greeting: string, d: TrialSummary): string {
  const ended = d.phase === 'just_ended'
  const parts: string[] = []

  parts.push(`<p style="margin:0 0 4px;font-size:16px;color:${INK}">Hi ${esc(greeting)},</p>`)

  if (d.empty) {
    // No artefacts, so no loss to name. Selling here would be selling a thing
    // they have no evidence works — that is the sale that gets refunded.
    parts.push(
      `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555">Your free week ${
        ended ? 'has ended' : 'ends tomorrow'
      }, and nothing went through it — no marked answers, so nothing for us to show you.</p>`,
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">If you want to know whether this is any good, it takes about three minutes: type a question, type what you&rsquo;d write in the exam, and see exactly where the marks land and where they don&rsquo;t.</p>`
    )
    return parts.join('')
  }

  parts.push(
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">${
      ended
        ? 'Your free week has ended. Everything you marked is still saved &mdash; nothing has been deleted, and it stays readable on the free plan.'
        : 'Your free week ends tomorrow. Everything you marked stays saved &mdash; here&rsquo;s what you built, and what pauses.'
    }</p>`
  )

  const score =
    d.marksAvailable > 0 ? `${d.marksEarned}/${d.marksAvailable}` : '—'
  parts.push(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
      statCell(String(d.scriptsMarked), d.scriptsMarked === 1 ? 'script marked' : 'scripts marked') +
      statCell(score, 'marks earned') +
      statCell(
        d.weakest ? `${d.weakest.percentage}%` : '—',
        d.weakest ? 'weakest topic' : 'no weak spot yet',
        d.weakest ? BRAND : INK
      ) +
      `</tr></table>`
  )

  parts.push(
    `<div style="font-size:17px;font-weight:800;color:${INK};margin:0 0 10px">${
      ended ? 'What pauses today' : 'What pauses tomorrow'
    }</div>`,
    pauseListHtml(d)
  )

  if (d.pointsToGo !== null && d.targetGrade && !d.onTrack) {
    parts.push(
      `<div style="background:linear-gradient(135deg,#fdf2f4,#faf7f2);border:1px solid #f0d9df;border-radius:14px;padding:16px 18px;margin:0 0 22px">
        <div style="font-size:15px;line-height:1.55;color:#333">You&rsquo;re about <strong style="color:${BRAND}">${d.pointsToGo} percentage ${
          d.pointsToGo === 1 ? 'point' : 'points'
        }</strong> off your target grade <strong>${esc(d.targetGrade)}</strong>. That&rsquo;s a handful of marks in the right places &mdash; and we know which places.</div>
      </div>`
    )
  }

  return parts.join('')
}

function buildText(greeting: string, d: TrialSummary, unsubscribeHref: string): string {
  const ended = d.phase === 'just_ended'
  const lines: string[] = [`Hi ${greeting},`, '']

  if (d.empty) {
    lines.push(
      `Your free week ${ended ? 'has ended' : 'ends tomorrow'}, and nothing went through it.`,
      '',
      'If you want to know whether this is any good, it takes three minutes:',
      `${SITE_URL}/mark`,
      ''
    )
  } else {
    lines.push(
      ended
        ? 'Your free week has ended. Everything you marked is still saved — nothing has been deleted.'
        : 'Your free week ends tomorrow. Everything you marked stays saved.',
      '',
      `${d.scriptsMarked} ${d.scriptsMarked === 1 ? 'script' : 'scripts'} marked` +
        (d.marksAvailable > 0 ? ` · ${d.marksEarned}/${d.marksAvailable} marks earned` : '') +
        (d.weakest ? ` · weakest: ${d.weakest.name} (${d.weakest.percentage}%)` : ''),
      '',
      ended ? 'What pauses today:' : 'What pauses tomorrow:',
      '- Your examiner’s report stops arriving on Sundays.',
      d.weakest
        ? `- ${d.weakest.name} stays on your list; the drills that close it stop being generated.`
        : '- Weak topics keep being tracked; the drills that close them stop.',
      '- Second-opinion marking goes back to the first 3 questions of a script.',
      ''
    )
    if (d.pointsToGo !== null && d.targetGrade && !d.onTrack) {
      lines.push(
        `You're about ${d.pointsToGo} percentage ${
          d.pointsToGo === 1 ? 'point' : 'points'
        } off your target grade ${d.targetGrade}.`,
        ''
      )
    }
    lines.push(`Keep the coach: ${SITE_URL}/pricing`, '')
  }

  lines.push(
    'Staying on the free plan is fine — your marked scripts stay saved either way.',
    '',
    '— Your MarkScheme examiner',
    '',
    `Unsubscribe: ${unsubscribeHref}`
  )
  return lines.join('\n')
}

/** Fire-and-forget. Always carries the one-click unsubscribe (kind 'trial'). */
export function sendTrialEndEmail(payload: {
  to: string
  recipientName?: string | null
  data: TrialSummary
  unsubscribeHref: string
}): void {
  const { to, recipientName, data, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || 'there'
  const ended = data.phase === 'just_ended'

  const subject = data.empty
    ? ended
      ? 'Your free week ended (you didn’t use it)'
      : 'Your free week ends tomorrow'
    : ended
      ? `Your free week ended — your ${data.scriptsMarked} marked ${
          data.scriptsMarked === 1 ? 'script stays' : 'scripts stay'
        } saved`
      : 'Your free week ends tomorrow — here’s what pauses'

  const cta = data.empty
    ? { label: 'Mark one question →', href: `${SITE_URL}/mark` }
    : { label: 'Keep my coach →', href: `${SITE_URL}/pricing` }

  const preheader = data.empty
    ? 'Three minutes to find out if it works.'
    : 'Nothing is deleted. Here is what goes quiet.'

  const bodyHtml =
    buildBodyHtml(greeting, data) +
    `<p style="margin:20px 0 0;font-size:14px;color:#666;line-height:1.6">Staying on the free plan is completely fine &mdash; your marked scripts stay saved either way.</p>` +
    `<p style="margin:18px 0 0;font-size:15px;color:${INK}">&mdash; Your MarkScheme examiner</p>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#999"><a href="${esc(unsubscribeHref)}" style="color:#999">Unsubscribe from trial reminders</a></p>`

  sendEmailAsync({
    to,
    subject,
    preheader,
    text: buildText(greeting, data, unsubscribeHref),
    html: renderBrandedEmailHtml({ preheader, bodyHtml, cta }),
  })
}
