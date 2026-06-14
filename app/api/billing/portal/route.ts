import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe/server'
import { getOrCreateStripeCustomer } from '@/lib/billing/customer'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { resolveSiteUrl } from '@/lib/site-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { return_url?: string }

function appOrigin(req: NextRequest): string {
  return req.headers.get('origin') || resolveSiteUrl() || new URL(req.url).origin
}

export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
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
  const returnPath = sanitizeNextPath(body.return_url, '/account/billing')

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${returnPath}`,
    })
    return jsonWithAuthCookies({ url: session.url }, pendingCookies)
  } catch (err) {
    console.error('[billing/portal] session creation failed:', err)
    return NextResponse.json(
      { error: 'Could not open the billing portal. Try again in a moment.' },
      { status: 502 }
    )
  }
}
