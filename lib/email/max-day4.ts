import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  escapeHtml as esc,
  noteHtml,
  renderBrandedEmailHtml,
} from '@/lib/email/templates'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/** Day ~4 Max coach: either push the first mark, or open Vault on the leak. */
export function sendMaxDay4Email(payload: {
  to: string
  recipientName?: string | null
  /** True when they have at least one attempt since Max. */
  hasMarked: boolean
  focusSubject?: string | null
}): void {
  const greeting = payload.recipientName?.trim() || 'there'
  const focus = payload.focusSubject?.trim() || 'your subject'
  const vaultHref = `${SITE_URL}/dashboard/vault`
  const markHref = `${SITE_URL}/mark`

  if (payload.hasMarked) {
    const preheader = `Your Max marks are in — Vault rebuilt around where ${focus} leaks.`
    const bodyHtml =
      `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#555">You marked — that is what Max is for. Open the Vault for the drill on where <strong style="color:${EMAIL_INK}">${esc(focus)}</strong> marks leaked, then sit one more past-paper desk.</p>` +
      noteHtml(
        'Sunday’s Max coach report will use these marks. Keep feeding it and the path tightens.'
      )

    sendEmailAsync({
      to: payload.to,
      subject: 'Max saw where marks leaked — open your Vault drill',
      preheader,
      text: [
        `Hi ${greeting},`,
        '',
        `You marked — open Vault for the ${focus} drill on where marks leaked.`,
        vaultHref,
        '',
        `— ${SITE_NAME}`,
      ].join('\n'),
      html: renderBrandedEmailHtml({
        preheader,
        bodyHtml,
        cta: { label: 'Open Max Vault drills →', href: vaultHref },
        secondaryLinks: [{ label: 'Mark another', href: markHref }],
      }),
    })
    return
  }

  const preheader = `Max is waiting on one ${focus} script — that is what rebuilds Vault.`
  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#555">You have had Max for a few days. The Vault, Cinema, and Sunday coach only get sharp after <strong style="color:${EMAIL_INK}">one marked script</strong> — preferably ${esc(focus)}.</p>` +
    noteHtml(
      'Priority deep marking is already on. Photograph or type one past-paper answer; Vault rebuilds around the gaps.'
    ) +
    `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_MUTED}">Two minutes. That is the whole ask.</p>`

  sendEmailAsync({
    to: payload.to,
    subject: `Mark one ${focus} question — Max is idle until you do`,
    preheader,
    text: [
      `Hi ${greeting},`,
      '',
      `Mark one ${focus} script so Max can rebuild your Vault path.`,
      markHref,
      '',
      `Vault: ${vaultHref}`,
      '',
      `— ${SITE_NAME}`,
    ].join('\n'),
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Mark one question →', href: markHref },
      secondaryLinks: [{ label: 'Open Max Vault', href: vaultHref }],
    }),
  })
}
