import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  RateLimitUnavailableError,
  checkSignupRateLimit,
  clientIp,
} from '@/lib/rate-limit'
import { rateLimitJson, rateLimitUnavailableJson } from '@/lib/http/rate-limit-response'
import { notifyAdminWaitlistSignup } from '@/lib/email/notifications'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim().slice(0, 120)
    const whatsapp = (body.whatsapp || '').trim().slice(0, 40)
    const subject_interest = (body.subject_interest || 'A-Level Math')
      .trim()
      .slice(0, 80)

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 })
    }

    const admin = createServiceClient()
    const ip = clientIp(request)
    let rate
    try {
      rate = await checkSignupRateLimit(admin, ip)
    } catch (err) {
      // Limiter outage: a retryable 503, not the generic 400 below.
      if (!(err instanceof RateLimitUnavailableError)) throw err
      console.error('[signup] rate limit unavailable:', err.message)
      return rateLimitUnavailableJson()
    }
    if (!rate.allowed) {
      return rateLimitJson(rate.message)
    }

    const { error } = await admin.from('signups').insert({
      email,
      whatsapp,
      subject_interest,
    })

    if (error) {
      console.error('[signup]', error)
      return NextResponse.json({ error: 'Could not save signup' }, { status: 500 })
    }

    // The slot was consumed atomically by checkSignupRateLimit above.

    notifyAdminWaitlistSignup({
      email,
      whatsapp,
      subjectInterest: subject_interest,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[signup] unexpected:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
