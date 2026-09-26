import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { CONTACT_EMAIL } from '@/lib/site-config'
import {
  RateLimitUnavailableError,
  checkContactRateLimit,
  clientIp,
} from '@/lib/rate-limit'
import { notifyAdminContactMessage, sendContactConfirmationEmail } from '@/lib/email/notifications'
import { HONEYPOT_FIELD, isHoneypotTripped } from '@/lib/honeypot'
import { rateLimitJson, rateLimitUnavailableJson } from '@/lib/http/rate-limit-response'

type Body = {
  name?: string
  email?: string
  message?: string
  company?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (isHoneypotTripped(body[HONEYPOT_FIELD])) {
    return NextResponse.json({ ok: true })
  }

  const name = (body.name || '').trim().slice(0, 80)
  const email = (body.email || '').trim().slice(0, 120)
  const message = (body.message || '').trim().slice(0, 4000)

  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: 'Please write a bit more detail (at least 10 characters).' },
      { status: 400 }
    )
  }

  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  const admin = createServiceClient()
  const ip = clientIp(request)
  let rate
  try {
    rate = await checkContactRateLimit(admin, ip, user?.id ?? null)
  } catch (err) {
    // Limiter outage: say "try again", never an unhandled 500 (and never
    // wave the message through unmetered).
    if (!(err instanceof RateLimitUnavailableError)) throw err
    console.error('[contact] rate limit unavailable:', err.message)
    return rateLimitUnavailableJson(
      `Could not send your message just now. Try again in a moment, or email us at ${CONTACT_EMAIL}.`
    )
  }
  if (!rate.allowed) {
    return rateLimitJson(rate.message)
  }

  const { error } = await admin.from('contact_messages').insert({
    name,
    email,
    message,
    user_id: user?.id ?? null,
  })

  if (error) {
    console.error('[contact]', error)
    return NextResponse.json(
      {
        error: `Could not send your message. Email us at ${CONTACT_EMAIL} instead.`,
      },
      { status: 500 }
    )
  }

  // The slot was consumed atomically by checkContactRateLimit above.

  void notifyAdminContactMessage({
    name,
    email,
    message,
    userId: user?.id ?? null,
  })

  void sendContactConfirmationEmail({ name, email, message })

  return NextResponse.json({ ok: true })
}
