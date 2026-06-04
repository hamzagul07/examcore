import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export function emailFromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `${SITE_NAME} <notifications@${CONTACT_EMAIL.split('@')[1] || 'markscheme.app'}>`
  )
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
  if (!apiKey) return false

  const to = Array.isArray(params.to) ? params.to : [params.to]

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
        html: params.html ?? textToSimpleHtml(params.text),
        reply_to: params.replyTo,
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

function textToSimpleHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const body = escaped
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br><br>' : `<p style="margin:0 0 8px">${line}</p>`))
    .join('')
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">${body}<p style="margin-top:24px;font-size:12px;color:#666"><a href="${SITE_URL}">${SITE_URL}</a></p></div>`
}
