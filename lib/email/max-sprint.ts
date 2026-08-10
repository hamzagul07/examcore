import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_INK,
  escapeHtml as esc,
  noteHtml,
  renderBrandedEmailHtml,
} from '@/lib/email/templates'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/** Fired once when Max sprint window opens (exam within 14 days). */
export function sendMaxSprintEmail(payload: {
  to: string
  recipientName?: string | null
  daysLeft: number
  bonusCredits: number
}): void {
  const greeting = payload.recipientName?.trim() || 'there'
  const vaultHref = `${SITE_URL}/dashboard/vault`
  const days = payload.daysLeft

  const preheader = `${days} day${days === 1 ? '' : 's'} to your exam — Max Sprint Pack is unlocked.`

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#555">Your exam is <strong style="color:${EMAIL_INK}">${days} day${days === 1 ? '' : 's'}</strong> away. The <strong style="color:${EMAIL_INK}">Max Sprint Pack</strong> is live in your Vault — timed focus paths from your weakest topics.</p>` +
    noteHtml(
      `<strong style="color:${EMAIL_INK}">+${payload.bonusCredits} sprint bonus marks</strong> are on your account for the final push.`
    )

  const text = [
    `Hi ${greeting},`,
    '',
    `Your Max Sprint Pack is unlocked — ${days} day${days === 1 ? '' : 's'} to your exam.`,
    `+${payload.bonusCredits} sprint bonus marks are on your account.`,
    '',
    `Open Vault: ${vaultHref}`,
    '',
    `— ${SITE_NAME}`,
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'Your Max sprint starts today',
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Open Max Sprint Pack →', href: vaultHref },
    }),
  })
}
