import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  noteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
} from '@/lib/email/templates'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/** Max activation: Vault + welcome bonus. */
export function sendMaxWelcomeEmail(payload: {
  to: string
  recipientName?: string | null
  bonusCredits: number
  creditsGranted: boolean
}): void {
  const greeting = payload.recipientName?.trim() || 'there'
  const vaultHref = `${SITE_URL}/dashboard/vault`
  const markHref = `${SITE_URL}/mark`

  const preheader = `Max is active — Resource Vault unlocked${payload.creditsGranted ? ` + ${payload.bonusCredits} bonus marks` : ''}.`

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#555">Welcome to <strong style="color:${EMAIL_INK}">Max</strong> — exam-season volume, the Resource Vault, priority deep marking, and your weekly Max coach report.</p>` +
    (payload.creditsGranted
      ? noteHtml(
          `<strong style="color:${EMAIL_INK}">+${payload.bonusCredits} bonus marks</strong> are on your account now. Credits only spend after your monthly Max allowance — they sit ready for peak weeks.`
        )
      : '') +
    sectionHeading('What just unlocked') +
    linkRowTable(
      linkRow({
        titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Max Resource Vault</span>`,
        metaHtml: `<span style="color:${EMAIL_MUTED}">Sprint pack, curated subjects, full-marks bank</span>`,
        href: vaultHref,
        actionLabel: 'Open Vault →',
      }) +
        linkRow({
          titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Mark with priority depth</span>`,
          metaHtml: `<span style="color:${EMAIL_MUTED}">Deep verify on big scripts — Max first</span>`,
          href: markHref,
          actionLabel: 'Mark →',
        })
    )

  const text = [
    `Hi ${greeting},`,
    '',
    `Welcome to Max on ${SITE_NAME}.`,
    payload.creditsGranted
      ? `+${payload.bonusCredits} bonus marks are on your account.`
      : '',
    '',
    `Open your Resource Vault: ${vaultHref}`,
    `Mark a paper: ${markHref}`,
    '',
    `— ${SITE_NAME}`,
  ]
    .filter(Boolean)
    .join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: `Max is active — Vault unlocked${payload.creditsGranted ? ` +${payload.bonusCredits} marks` : ''}`,
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Open your Max Vault →', href: vaultHref },
    }),
  })
}
