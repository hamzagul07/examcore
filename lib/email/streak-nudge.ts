import { sendEmailAsync } from '@/lib/email/send'
import { renderBrandedEmailHtml } from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * "Your streak ends tonight" re-engagement email. Fire-and-forget. Always
 * includes the one-click unsubscribe link (kind 'streak').
 */
export function sendStreakNudgeEmail(payload: {
  to: string
  recipientName?: string | null
  streak: number
  unsubscribeHref: string
}): void {
  const { to, recipientName, streak, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || 'there'
  const markUrl = `${SITE_URL}/mark`

  const bodyHtml =
    `<p style="margin:0 0 10px;font-size:16px;color:#1a1a1a">Hi ${esc(greeting)},</p>` +
    `<div style="text-align:center;margin:6px 0 16px">
      <div style="font-size:46px;line-height:1">🔥</div>
      <div style="font-size:22px;font-weight:800;color:#9f1239;margin-top:6px">${streak}-day streak</div>
    </div>` +
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333">You've marked something ${streak} days running — that's real momentum. But you haven't marked anything today, and your streak resets at midnight.</p>` +
    `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#333"><strong>One question keeps it alive.</strong> Two minutes now beats starting from zero tomorrow.</p>` +
    `<p style="margin:22px 0 0;font-size:12px;color:#999"><a href="${esc(unsubscribeHref)}" style="color:#999">Turn off streak reminders</a></p>`

  const html = renderBrandedEmailHtml({
    preheader: `Don't lose your ${streak}-day streak — one question keeps it alive.`,
    bodyHtml,
    cta: { label: 'Keep my streak alive →', href: markUrl },
  })

  const text = [
    `Hi ${greeting},`,
    '',
    `Your ${streak}-day streak resets at midnight and you haven't marked anything today. One question keeps it alive:`,
    markUrl,
    '',
    `Turn off streak reminders: ${unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to,
    subject: `🔥 Your ${streak}-day streak ends tonight`,
    preheader: `One question keeps your ${streak}-day streak alive.`,
    text,
    html,
  })
}
