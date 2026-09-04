import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  verifyResendSignature,
  suppressionFromEvent,
} from '@/lib/email/resend-webhook'

export const runtime = 'nodejs' // raw body needed for the signature
export const dynamic = 'force-dynamic'

/**
 * Resend delivery events — the half of sending we could not see.
 *
 * The campaign runner reports what Resend ACCEPTED. Hard bounces and spam
 * complaints arrive afterwards, and without this endpoint they arrived nowhere:
 * a dead address stayed in every future audience, and a student who pressed
 * "spam" would be mailed again. That is how a sending domain dies, and every
 * activation email in this product depends on it living.
 *
 * Only two of Resend's events change anything. The rest are acknowledged and
 * dropped rather than stored — there is no question this product is currently
 * asking that an opens table would answer, and storing engagement per student
 * is a privacy cost with no reader.
 *
 * Configure in the Resend dashboard: point a webhook at /api/webhooks/resend
 * and put its signing secret in RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET is not set')
    return new NextResponse('Webhook not configured', { status: 500 })
  }

  const body = await req.text()
  const ok = verifyResendSignature({
    body,
    id: req.headers.get('svix-id'),
    timestamp: req.headers.get('svix-timestamp'),
    signature: req.headers.get('svix-signature'),
    secret,
  })

  if (!ok) {
    // Unsigned probes on a public URL are routine; a bad signature is not.
    console.warn('[resend-webhook] signature verification failed')
    return new NextResponse('Invalid signature', { status: 403 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return new NextResponse('Invalid payload', { status: 400 })
  }

  const suppression = suppressionFromEvent(event.type ?? '', event.data)
  if (!suppression) {
    return NextResponse.json({ received: true, suppressed: false })
  }

  // Upsert rather than insert: the same address can bounce repeatedly, and a
  // complaint after a bounce should replace the reason with the stronger one.
  // `first_seen` is left alone by the update so the original date survives.
  const supabase = createServiceClient()
  const { error } = await supabase.from('email_suppressions').upsert(
    {
      email: suppression.email,
      reason: suppression.reason,
      detail: suppression.detail,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'email' }
  )

  if (error) {
    // 500 so Resend retries — losing a suppression means mailing them again.
    console.error('[resend-webhook] suppression upsert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.warn(
    `[resend-webhook] suppressed ${suppression.email} (${suppression.reason})`
  )
  return NextResponse.json({ received: true, suppressed: true })
}
