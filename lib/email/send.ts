import { after } from 'next/server'
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site-config'
import { renderBrandedEmailHtml, textToHtmlParagraphs } from '@/lib/email/templates'
import { oneClickUrlFromPageHref } from '@/lib/community/email-unsubscribe'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
  preheader?: string
  cta?: { label: string; href: string }
  /**
   * The body's unsubscribe link. Supplying it adds the List-Unsubscribe headers,
   * which is what Gmail and Yahoo require of bulk senders — pass it for anything
   * recurring, leave it off transactional mail nobody may opt out of receiving.
   */
  unsubscribeHref?: string
}

/**
 * RFC 8058 headers. `List-Unsubscribe-Post` is what makes the provider render a
 * native "Unsubscribe" control next to the sender name and POST to the URL
 * instead of making the student hunt for the link in the body.
 */
function unsubscribeHeaders(href?: string): Record<string, string> | undefined {
  if (!href) return undefined
  const oneClick = oneClickUrlFromPageHref(href)
  const targets = [oneClick ? `<${oneClick}>` : null, `<mailto:${CONTACT_EMAIL}?subject=unsubscribe>`]
    .filter(Boolean)
    .join(', ')

  const headers: Record<string, string> = { 'List-Unsubscribe': targets }
  // Only advertise one-click when there is a real endpoint to POST to.
  if (oneClick) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  return headers
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

/**
 * Fire-and-forget wrapper for route handlers.
 *
 * The naive version — `void sendEmail(...)` — races the platform: once the
 * handler returns its response the instance can be frozen or torn down, and an
 * in-flight request to Resend goes with it. The send is never retried and
 * nothing is logged, so the failure looks like "some emails just don't arrive".
 *
 * `after()` hands the promise to the framework, which keeps the invocation alive
 * until it settles. Outside a request scope (scripts, tests, the preview tool)
 * there is nothing to defer to and the plain promise is correct — it is already
 * running, and those callers stay alive on their own.
 */
export function sendEmailAsync(params: SendEmailParams): void {
  const pending = sendEmail(params)
  try {
    after(() => pending)
  } catch {
    void pending
  }
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
        headers: unsubscribeHeaders(params.unsubscribeHref),
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
