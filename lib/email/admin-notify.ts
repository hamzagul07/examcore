import { CONTACT_EMAIL } from '@/lib/site-config'

type ContactNotifyPayload = {
  name: string
  email: string
  message: string
  userId?: string | null
}

/**
 * Optional admin alert when RESEND_API_KEY is set (Supabase Pro + custom SMTP
 * pairs well with Resend for transactional mail). Failures are logged only —
 * contact_messages insert is the source of truth.
 */
export async function notifyAdminContactMessage(
  payload: ContactNotifyPayload
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const from =
    process.env.RESEND_FROM?.trim() || `MarkScheme <notifications@${CONTACT_EMAIL.split('@')[1] || 'markscheme.app'}>`

  const text = [
    `New contact form message`,
    ``,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.userId ? `User ID: ${payload.userId}` : 'Guest (not signed in)',
    ``,
    payload.message,
    ``,
    `— Stored in Supabase contact_messages`,
  ].join('\n')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: process.env.CONTACT_NOTIFY_TO?.trim() || CONTACT_EMAIL,
        reply_to: payload.email,
        subject: `[MarkScheme] Contact from ${payload.name}`,
        text,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] contact notify failed:', res.status, body)
    }
  } catch (err) {
    console.error('[email] contact notify error:', err)
  }
}
