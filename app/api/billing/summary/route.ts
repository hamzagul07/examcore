import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { computeAllowance } from '@/lib/billing/enforcement'
import { isUnlimited } from '@/lib/billing/caps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lightweight billing summary for the header chip + account page. Pure read
 * (no shadow logging). Returns 401 for signed-out users so the client can show
 * the anonymous state. Refetched after each mark so the count decrements.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 401 })
  }

  const a = await computeAllowance(user.id)
  const unlimited = isUnlimited(a.tier)

  return NextResponse.json({
    signedIn: true,
    tier: a.tier,
    status: a.status,
    unlimited,
    marks_used: a.marks_used,
    cap: unlimited ? null : a.cap,
    remaining: unlimited ? null : a.remaining,
    credit_balance: a.credit_balance,
    founding_member: a.founding_member,
    period_resets_at: a.period_resets_at ?? null,
  })
}
