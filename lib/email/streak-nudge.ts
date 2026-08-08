import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BRAND as BRAND,
  EMAIL_INK as INK,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  statCell,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'

/**
 * "Your streak ends tonight" re-engagement email. Fire-and-forget. Always
 * includes the one-click unsubscribe link (kind 'streak').
 *
 * The three tiles are what make the streak worth protecting: a bare "6-day
 * streak" is an abstraction, but "6 days, 12 questions, and it's your best run
 * yet" is a thing you can lose. All three come from the same attempt timestamps
 * the streak itself is computed from, so they cannot disagree with the
 * dashboard.
 */
export function sendStreakNudgeEmail(payload: {
  to: string
  recipientName?: string | null
  streak: number
  /** Attempts in the last 7 days, today included. */
  markedThisWeek: number
  /** Longest run in the window the caller looked at. */
  bestStreak: number
  unsubscribeHref: string
}): void {
  const { to, recipientName, streak, markedThisWeek, bestStreak, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || 'there'
  const markUrl = `${SITE_URL}/mark`

  // Matching their own record is the strongest version of this email, so say so
  // rather than printing the same number twice under a "best run" label.
  const atBest = streak >= bestStreak

  const statsRow =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
    statCell(String(streak), 'day streak', BRAND) +
    statCell(String(markedThisWeek), 'marked this week') +
    statCell(atBest ? '★' : String(bestStreak), atBest ? 'your best run yet' : 'your best run', INK) +
    `</tr></table>`

  const closing = atBest
    ? `<strong>One question keeps it alive.</strong> You have never gone longer than this — two minutes now beats starting from zero tomorrow.`
    : `<strong>One question keeps it alive.</strong> Two minutes now beats starting from zero tomorrow.`

  const bodyHtml =
    `<p style="margin:0 0 14px;font-size:16px;color:${INK}">Hi ${esc(greeting)},</p>` +
    `<div style="text-align:center;margin:0 0 14px"><div style="font-size:40px;line-height:1">🔥</div></div>` +
    statsRow +
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333">You've marked something ${streak} days running — that's real momentum. But you haven't marked anything today, and your streak resets at midnight.</p>` +
    `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#333">${closing}</p>`

  const html = renderBrandedEmailHtml({
    preheader: `Don't lose your ${streak}-day streak — one question keeps it alive.`,
    bodyHtml,
    cta: { label: 'Keep my streak alive →', href: markUrl },
    unsubscribe: { label: 'Turn off streak reminders', href: unsubscribeHref },
  })

  const text = [
    `Hi ${greeting},`,
    '',
    `Your ${streak}-day streak resets at midnight and you haven't marked anything today.`,
    '',
    `${streak}-day streak · ${markedThisWeek} marked this week · ${
      atBest ? 'your best run yet' : `best run ${bestStreak} days`
    }`,
    '',
    'One question keeps it alive:',
    markUrl,
    '',
    `Turn off streak reminders: ${unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to,
    subject: `Your ${streak}-day streak ends tonight`,
    preheader: `One question keeps your ${streak}-day streak alive.`,
    text,
    html,
    unsubscribeHref,
  })
}
