import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { computeBillingSummary } from '@/lib/billing/enforcement'
import { shouldShowApproachingLimitBanner } from '@/lib/billing/enforcement-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ signedIn: false, access: 'free' })
  }

  const summary = await computeBillingSummary(user.id)
  const showMetering = shouldShowApproachingLimitBanner()
  const enforce = summary.enforcement_mode === 'enforce'

  return NextResponse.json({
    signedIn: true,
    tier: summary.tier,
    access: summary.access,
    trial_ends_at: summary.trial_ends_at ?? null,
    status: summary.status,
    founding_member: summary.founding_member,
    credit_balance: summary.credit_balance,
    period_resets_at: summary.period_resets_at ?? null,
    enforcement_mode: summary.enforcement_mode,
    questions: {
      used: summary.questions.used,
      cap: summary.questions.cap,
      remaining: summary.questions.remaining,
      warning: summary.questions.warning && showMetering,
      blocked:
        enforce &&
        summary.questions.remaining <= 0 &&
        summary.credit_balance <= 0 &&
        Boolean(summary.questions.reason),
    },
    omni: {
      used: summary.omni.used,
      cap: summary.omni.cap,
      remaining: summary.omni.remaining,
      warning: summary.omni.warning && showMetering,
      blocked:
        enforce &&
        summary.omni.remaining <= 0 &&
        summary.credit_balance <= 0 &&
        Boolean(summary.omni.reason),
    },
    // Legacy fields for gradual client migration
    marks_used: summary.questions.used,
    cap: summary.questions.cap,
    remaining: summary.questions.remaining,
  })
}
