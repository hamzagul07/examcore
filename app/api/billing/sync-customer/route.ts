import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreatePolarCustomer } from '@/lib/polar/customer'
import { polarErrorForLog } from '@/lib/polar/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ensure the signed-in user has a linked Polar customer. Called after email
 * verification and lazily on first authenticated load. Best-effort: if Polar
 * is unreachable we log and return 200 with synced:false so we never block the
 * user's signup/app flow.
 */
export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  try {
    const service = createServiceClient()
    const customerId = await getOrCreatePolarCustomer(service, {
      id: user.id,
      email: user.email,
    })
    return jsonWithAuthCookies({ synced: true, customerId }, pendingCookies)
  } catch (err) {
    console.error('[billing/sync-customer] failed:', polarErrorForLog(err))
    // Don't block the user — a later request (or the checkout flow) will retry.
    return jsonWithAuthCookies({ synced: false }, pendingCookies, { status: 200 })
  }
}
