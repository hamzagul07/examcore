import { sendEmail } from '@/lib/email/send'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  noteHtml,
  renderBrandedEmailHtml,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'
import { formatMinutes, workBlocks, type HydratedBlock, type HydratedDay, type PlanProgress } from '@/lib/plan/plan-view'

/**
 * The morning check-in: today's tasks from the student's own plan, with one
 * honest line about how they are doing against it. Sent by the plan-checkin
 * cron (lib/plan/checkin.ts) — awaited, so the batch can record the send.
 *
 * Each row is the task's objective (what to do, from a template) and opens
 * the task's own destination with its id, so the plan page can offer the
 * check-in when the student comes back. The second line is a fact about
 * recent days ("You've studied on 4 of the last 6 days"), never a tally of
 * what did not happen.
 *
 * Rendering is separate from sending so the email can be previewed
 * (scripts/plan-preview.ts --email) without an API key.
 */

export type PlanCheckinPayload = {
  recipientName?: string | null
  day: HydratedDay
  line: string
  /** studiedDaysLine(): a fact about the last week. Optional for v2 callers. */
  studiedLine?: string
  progress: PlanProgress
  unsubscribeHref: string
}

/**
 * The task's link with its id, so the plan page knows which task came back,
 * and with src=checkin, so opening a task straight from the email counts as
 * opening the check-in (the reminder backoff would otherwise never reset).
 * The return path carries src=checkin too, for the way back to the plan.
 */
function taskHref(block: HydratedBlock, planHref: string): string {
  if (!block.href) return planHref
  if (!block.href.startsWith('/')) return block.href
  const hashAt = block.href.indexOf('#')
  const base = hashAt >= 0 ? block.href.slice(0, hashAt) : block.href
  const hash = hashAt >= 0 ? block.href.slice(hashAt) : ''
  const qAt = base.indexOf('?')
  const path = qAt >= 0 ? base.slice(0, qAt) : base
  const params = new URLSearchParams(qAt >= 0 ? base.slice(qAt + 1) : '')
  if (block.id && !params.has('task')) params.set('task', block.id)
  params.set('src', 'checkin')
  const back = params.get('return')
  if (back && back.startsWith('/dashboard/plan') && !/[?&]src=/.test(back)) params.set('return', `${back}${back.includes('?') ? '&' : '?'}src=checkin`)
  return `${SITE_URL}${path}?${params.toString()}${hash}`
}

export function renderPlanCheckinEmail(payload: PlanCheckinPayload): {
  subject: string
  preheader: string
  html: string
  text: string
} {
  const { day } = payload
  const first = (payload.recipientName ?? '').trim().split(/\s+/)[0] || 'there'
  // ?src=checkin: the page counts the open (plan_checkin_opened) and strips it.
  const planHref = `${SITE_URL}/dashboard/plan?src=checkin`
  const blocks = workBlocks(day)

  const countdown = day.daysLeft === 1 ? 'Exam tomorrow' : `${day.daysLeft} days to go`
  const subject =
    day.daysLeft === 1
      ? 'Tomorrow. Light review, then stop.'
      : `Day ${day.day} — ${countdown}${blocks.length ? `, ${formatMinutes(day.workMinutes)} on the plan` : ''}`
  const preheader = payload.line

  const rows = blocks
    .map((b) =>
      linkRow({
        titleHtml: `<div style="font-family:${EMAIL_SANS};font-size:14px;color:${EMAIL_INK};line-height:1.4">${esc(b.objective ?? b.label)}</div>`,
        metaHtml: [b.resourceLabel, `${b.minutes} min`]
          .filter((m): m is string => Boolean(m))
          .map(esc)
          .join(' · '),
        href: taskHref(b, planHref),
        actionLabel: b.kind === 'timed_paper' ? 'Sit it →' : 'Open →',
      })
    )
    .join('')

  const studiedLine = payload.studiedLine
    ? `<p style="margin:0 0 6px;font-family:${EMAIL_SANS};font-size:12px;color:${EMAIL_MUTED}">${esc(payload.studiedLine)}</p>`
    : ''

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(first)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555">${esc(payload.line)}</p>` +
    studiedLine +
    `<p style="margin:0 0 10px;font-family:${EMAIL_SANS};font-size:13px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:${EMAIL_MUTED}">Day ${day.day} · ${esc(countdown)}</p>` +
    `<p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${EMAIL_INK}">${esc(day.focus)}</p>` +
    (rows ? linkRowTable(rows) : '') +
    noteHtml('Breaks are in the plan. Take them — the next block is better for it.')

  const text = [
    `Hi ${first},`,
    '',
    payload.line,
    payload.studiedLine ?? '',
    '',
    `Day ${day.day} · ${countdown}`,
    day.focus,
    ...blocks.map((b) => `- ${b.objective ?? b.label} (${b.minutes} min)${b.href ? ` ${taskHref(b, planHref)}` : ''}`),
    '',
    `Open today's plan: ${planHref}`,
    '',
    `Turn off plan check-ins: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')

  const html = renderBrandedEmailHtml({
    preheader,
    kicker: 'Study plan',
    bodyHtml,
    cta: { label: "Open today's plan →", href: planHref },
    unsubscribe: { label: 'Turn off plan check-ins', href: payload.unsubscribeHref },
  })

  return { subject, preheader, html, text }
}

export async function sendPlanCheckinEmail(payload: PlanCheckinPayload & { to: string }): Promise<boolean> {
  const { subject, preheader, html, text } = renderPlanCheckinEmail(payload)
  return sendEmail({
    to: payload.to,
    subject,
    preheader,
    text,
    html,
    unsubscribeHref: payload.unsubscribeHref,
  })
}
