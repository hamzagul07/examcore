import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { computeBillingSummary } from '@/lib/billing/enforcement'
import { shouldShowApproachingLimitBanner } from '@/lib/billing/enforcement-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// authenticateRouteRequest (not createClient) so the mobile app's
// Authorization: Bearer token works — with cookie-only auth every native
// client looked signed-out and was treated as free.
export async function GET(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ signedIn: false, access: 'free' }, pendingCookies)
  }

  const summary = await computeBillingSummary(user.id)
  const showMetering = shouldShowApproachingLimitBanner()
  const enforce = summary.enforcement_mode === 'enforce'

  return jsonWithAuthCookies({
    signedIn: true,
    tier: summary.tier,
    access: summary.access,
    status: summary.status,
    credit_balance: summary.credit_balance,
    period_resets_at: summary.period_resets_at ?? null,
    enforcement_mode: summary.enforcement_mode,
    questions: {
      used: summary.questions.used,
      cap: summary.questions.cap,
      remaining: summary.questions.remaining,
      // Marks a month added to the cap by a verified teacher's class (spec §7);
      // the credit chip and limit banner read it via classBonusFromSummary().
      class_bonus: summary.questions.class_bonus,
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
  }, pendingCookies)
}
