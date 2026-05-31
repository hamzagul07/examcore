import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe/server'
import { getOrCreateStripeCustomer } from '@/lib/billing/customer'
import { sanitizeNextPath } from '@/lib/auth-redirect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { return_url?: string }

function appOrigin(req: NextRequest): string {
  return (
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = await req.json()
  } catch {
    // body is optional for the portal
  }

  const service = createServiceClient()

  let customerId: string
  try {
    customerId = await getOrCreateStripeCustomer(service, {
      id: user.id,
      email: user.email,
    })
  } catch (err) {
    console.error('[billing/portal] customer creation failed:', err)
    return NextResponse.json(
      { error: 'Could not open the billing portal. Try again in a moment.' },
      { status: 502 }
    )
  }

  const origin = appOrigin(req)
  const returnPath = sanitizeNextPath(body.return_url, '/account')

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${returnPath}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal] session creation failed:', err)
    return NextResponse.json(
      { error: 'Could not open the billing portal. Try again in a moment.' },
      { status: 502 }
    )
  }
}
