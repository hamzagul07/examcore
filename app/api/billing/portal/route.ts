import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { polar } from '@/lib/polar/server'
import { getOrCreatePolarCustomer } from '@/lib/polar/customer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { return_url?: string }

export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  // Body is optional for the portal (return_url currently unused — Polar's
  // portal has its own navigation), but we still parse defensively.
  try {
    ;(await req.json()) as Body
  } catch {
    // no-op
  }

  const service = createServiceClient()

  try {
    // Ensure a Polar customer exists (a user may open the portal before ever
    // purchasing), then open a customer-portal session for them.
    await getOrCreatePolarCustomer(service, { id: user.id, email: user.email })

    const session = await polar.customerSessions.create({
      externalCustomerId: user.id,
    })

    return jsonWithAuthCookies({ url: session.customerPortalUrl }, pendingCookies)
  } catch (err) {
    console.error('[billing/portal] Polar portal session failed:', err)
    return NextResponse.json(
      { error: 'Could not open the billing portal. Try again in a moment.' },
      { status: 502 }
    )
  }
}
