import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BORDER,
  EMAIL_INK as INK,
  EMAIL_MUTED as MUTED,
  EMAIL_SANS as SANS,
  calloutHtml,
  escapeHtml as esc,
  noteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
  statCell,
} from '@/lib/email/templates'

/** What one creator's weekly brief says. Computed in lib/creators/brief.ts. */
export type CreatorBriefData = {
  handle: string
  code: string
  markedThisWeek: number
  markedTotal: number
  joinedTotal: number
  giftLeft: number
  giftPool: number
  nextMilestone: { label: string; remaining: number } | null
  /** The audience gap headline, once there is enough marked work to say it. */
  gap: { label: string; earnedPct: number; scripts: number } | null
  /** Three formats to film this week. */
  hooks: string[]
  spaceUrl: string
  studioUrl: string
  markUrl: string
}

function statRow(cells: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px"><tr>${cells}</tr></table>`
}

function yourNumberHtml(d: CreatorBriefData): string {
  if (d.gap) {
    return calloutHtml(
      `<div style="font-family:${SANS};font-size:17px;line-height:1.45;color:${INK}"><strong>${d.gap.earnedPct}%</strong> — that is how much of the <strong>${esc(d.gap.label)}</strong> marks your followers earn, across ${d.gap.scripts} marked answers.</div>
       <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${MUTED};margin-top:8px">Say that back to them in one video. Nobody else can hand them this number.</div>`,
      'Your number this week'
    )
  }
  if (d.nextMilestone) {
    return calloutHtml(
      `<div style="font-family:${SANS};font-size:17px;line-height:1.45;color:${INK}"><strong>${d.nextMilestone.remaining.toLocaleString('en-GB')}</strong> more marked answers to <strong>${esc(d.nextMilestone.label)}</strong>.</div>
       <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${MUTED};margin-top:8px">One video with the code in the caption usually moves this the same day.</div>`,
      'Where you are'
    )
  }
  return ''
}

function hooksHtml(hooks: string[]): string {
  const items = hooks
    .map(
      (h, i) =>
        `<tr><td valign="top" style="width:28px;padding:6px 0;font-family:${SANS};font-size:12px;font-weight:700;color:${MUTED}">0${i + 1}</td><td style="padding:6px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK};border-bottom:1px solid ${EMAIL_BORDER}">${esc(h)}</td></tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${items}</table>`
}

function buildBodyHtml(greeting: string, d: CreatorBriefData): string {
  const parts: string[] = []
  parts.push(
    `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK}">Hi ${esc(greeting)} — here is what your code did this week.</p>`
  )
  parts.push(
    statRow(
      statCell(String(d.markedThisWeek), 'answers this week', '#2f7d4f') +
        statCell(d.markedTotal.toLocaleString('en-GB'), 'answers all time') +
        statCell(String(d.joinedTotal), 'students joined')
    )
  )
  const number = yourNumberHtml(d)
  if (number) parts.push(number)
  parts.push(sectionHeading('Three things to film this week', 'Each is a 20-minute video. Put the code in the caption and the link in your bio.'))
  parts.push(hooksHtml(d.hooks))
  parts.push(
    noteHtml(
      `Gifts left this month: <strong>${d.giftLeft}</strong> of ${d.giftPool} marks. Every post that mentions MarkScheme carries <strong>#ad</strong> — the share kit in your studio has it written in.`
    )
  )
  return parts.join('')
}

function buildText(greeting: string, d: CreatorBriefData, unsubscribeHref: string): string {
  const lines = [
    `Hi ${greeting} — here is what your code did this week.`,
    '',
    `Answers marked this week: ${d.markedThisWeek}`,
    `Answers all time: ${d.markedTotal}`,
    `Students joined: ${d.joinedTotal}`,
    '',
  ]
  if (d.gap) {
    lines.push(
      `Your number: your followers earn ${d.gap.earnedPct}% of the ${d.gap.label} marks (${d.gap.scripts} marked answers). Say it back to them in one video.`,
      ''
    )
  } else if (d.nextMilestone) {
    lines.push(`${d.nextMilestone.remaining} more marked answers to "${d.nextMilestone.label}".`, '')
  }
  lines.push('Three things to film this week:')
  d.hooks.forEach((h, i) => lines.push(`${i + 1}. ${h}`))
  lines.push(
    '',
    `Gifts left this month: ${d.giftLeft} of ${d.giftPool} marks. Every post that mentions MarkScheme carries #ad.`,
    '',
    `Your studio: ${d.studioUrl}`,
    `Your space: ${d.spaceUrl}`,
    `Straight to marking with your code: ${d.markUrl}`,
    '',
    `Stop the weekly creator brief: ${unsubscribeHref}`
  )
  return lines.join('\n')
}

export function sendCreatorBriefEmail(payload: {
  to: string
  recipientName?: string | null
  data: CreatorBriefData
  unsubscribeHref: string
}): void {
  const { to, recipientName, data, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || `@${data.handle}`
  const preheader =
    data.markedThisWeek > 0
      ? `${data.markedThisWeek} answers marked with ${data.code} this week, and three things to film.`
      : `Three things to film this week, and where code ${data.code} stands.`

  const html = renderBrandedEmailHtml({
    kicker: 'Creator brief',
    preheader,
    bodyHtml: buildBodyHtml(greeting, data),
    cta: { label: 'Open your studio →', href: data.studioUrl },
    secondaryLinks: [
      { label: 'Your space', href: data.spaceUrl },
      { label: 'Straight to marking, code applied', href: data.markUrl },
    ],
    unsubscribe: { label: 'Stop the weekly creator brief', href: unsubscribeHref },
  })

  sendEmailAsync({
    to,
    subject:
      data.markedThisWeek > 0
        ? `Creator brief: ${data.markedThisWeek} answers marked with ${data.code} this week`
        : `Creator brief: three things to film with ${data.code} this week`,
    preheader,
    text: buildText(greeting, data, unsubscribeHref),
    html,
    unsubscribeHref,
  })
}
