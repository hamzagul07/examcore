import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { renderBrandedEmailHtml, textToHtmlParagraphs } from '@/lib/email/templates'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
  preheader?: string
  cta?: { label: string; href: string }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/** Verified sender in Resend — must use @markscheme.app after domain verification. */
export function emailFromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `${SITE_NAME} <hello@${CONTACT_EMAIL.split('@')[1] || 'markscheme.app'}>`
  )
}

/** Replies land in your hello@ inbox (Google Workspace or forwarding). */
export function emailReplyToAddress(): string {
  return process.env.RESEND_REPLY_TO?.trim() || CONTACT_EMAIL
}

export function adminNotifyAddress(): string {
  return process.env.CONTACT_NOTIFY_TO?.trim() || CONTACT_EMAIL
}

/** Fire-and-forget safe wrapper for route handlers. */
export function sendEmailAsync(params: SendEmailParams): void {
  void sendEmail(params)
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[email] RESEND_API_KEY not set — skipped:', params.subject)
    }
    return false
  }

  const to = Array.isArray(params.to) ? params.to : [params.to]
  const html =
    params.html ??
    renderBrandedEmailHtml({
      preheader: params.preheader,
      bodyHtml: textToHtmlParagraphs(params.text),
      cta: params.cta,
    })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to,
        subject: params.subject,
        text: params.text,
        html,
        reply_to: params.replyTo ?? emailReplyToAddress(),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] send failed:', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] send error:', err)
    return false
  }
}

/** Legacy helper — prefer renderBrandedEmailHtml via sendEmail. */
export function textToSimpleHtml(text: string): string {
  return renderBrandedEmailHtml({ bodyHtml: textToHtmlParagraphs(text) })
}
