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
import { formatMinutes, workBlocks, type HydratedDay, type PlanProgress } from '@/lib/plan/plan-view'

/**
 * The morning check-in: today's blocks from the student's own plan, with one
 * honest line about how they are doing against it. Sent by the plan-checkin
 * cron (lib/plan/checkin.ts) — awaited, so the batch can record the send.
 */
export async function sendPlanCheckinEmail(payload: {
  to: string
  recipientName?: string | null
  day: HydratedDay
  line: string
  progress: PlanProgress
  unsubscribeHref: string
}): Promise<boolean> {
  const { day, progress } = payload
  const first = (payload.recipientName ?? '').trim().split(/\s+/)[0] || 'there'
  const planHref = `${SITE_URL}/dashboard/plan`
  const blocks = workBlocks(day)

  const countdown =
    day.daysLeft === 1 ? 'Exam tomorrow' : `${day.daysLeft} days to go`
  const subject =
    day.daysLeft === 1
      ? 'Tomorrow. Light review, then stop.'
      : `Day ${day.day} — ${countdown}${blocks.length ? `, ${formatMinutes(day.workMinutes)} on the plan` : ''}`
  const preheader = payload.line

  const rows = blocks
    .map((b) =>
      linkRow({
        titleHtml: `<div style="font-family:${EMAIL_SANS};font-size:14px;color:${EMAIL_INK};line-height:1.4">${esc(b.label)}</div>`,
        metaHtml: [b.resourceLabel, `${b.minutes} min`]
          .filter((m): m is string => Boolean(m))
          .map(esc)
          .join(' · '),
        href: b.href ? `${SITE_URL}${b.href}` : planHref,
        actionLabel: b.kind === 'timed_paper' ? 'Sit it →' : 'Open →',
      })
    )
    .join('')

  const progressLine =
    progress.scheduled > 0
      ? `<p style="margin:0 0 6px;font-family:${EMAIL_SANS};font-size:12px;color:${EMAIL_MUTED}">${progress.done} of ${progress.scheduled} days done so far.</p>`
      : ''

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(first)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555">${esc(payload.line)}</p>` +
    progressLine +
    `<p style="margin:0 0 10px;font-family:${EMAIL_SANS};font-size:13px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:${EMAIL_MUTED}">Day ${day.day} · ${esc(countdown)}</p>` +
    `<p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${EMAIL_INK}">${esc(day.focus)}</p>` +
    (rows ? linkRowTable(rows) : '') +
    noteHtml('Breaks are in the plan. Take them — the next block is better for it.')

  const text = [
    `Hi ${first},`,
    '',
    payload.line,
    progress.scheduled > 0 ? `${progress.done} of ${progress.scheduled} days done so far.` : '',
    '',
    `Day ${day.day} · ${countdown}`,
    day.focus,
    ...blocks.map((b) => `- ${b.label} (${b.minutes} min)${b.href ? ` ${SITE_URL}${b.href}` : ''}`),
    '',
    `Open today's plan: ${planHref}`,
    '',
    `Turn off plan check-ins: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')

  return sendEmail({
    to: payload.to,
    subject,
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      kicker: 'Study plan',
      bodyHtml,
      cta: { label: "Open today's plan →", href: planHref },
      unsubscribe: { label: 'Turn off plan check-ins', href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}
