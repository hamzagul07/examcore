import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateStripeCustomer } from '@/lib/billing/customer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ensure the signed-in user has a linked Stripe customer. Called after email
 * verification and lazily on first authenticated load. Best-effort: if Stripe
 * is unreachable we log and return 200 with synced:false so we never block the
 * user's signup/app flow.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const customerId = await getOrCreateStripeCustomer(service, {
      id: user.id,
      email: user.email,
    })
    return NextResponse.json({ synced: true, customerId })
  } catch (err) {
    console.error('[billing/sync-customer] failed:', err)
    // Don't block the user — a later request (or the checkout flow) will retry.
    return NextResponse.json({ synced: false }, { status: 200 })
  }
}
