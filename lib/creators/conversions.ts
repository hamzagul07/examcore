/**
 * Paid conversions attributed to a creator (docs/CREATORS_PROGRAM.md).
 *
 * Recorded from day one so that revenue share, when it exists, can be paid
 * retroactively and honestly — Duolingo's unpaid-contributor ending is the
 * cautionary tale. Attribution is `user_profiles.referred_by`, written once at
 * signup; this only turns a subscription event into a ledger row.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function recordCreatorConversion(
  supabase: SupabaseClient,
  input: {
    userId: string
    polarSubscriptionId: string
    tier: string | null
    event: string
  }
): Promise<void> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('referred_by')
    .eq('id', input.userId)
    .maybeSingle()
  const creatorId = (profile?.referred_by as string | null) ?? null
  if (!creatorId || creatorId === input.userId) return

  const { error } = await supabase.from('creator_conversions').insert({
    creator_id: creatorId,
    user_id: input.userId,
    polar_subscription_id: input.polarSubscriptionId,
    tier: input.tier,
    event: input.event,
  })
  // 23505: the same event for the same subscription — a webhook retry.
  if (error && error.code !== '23505') {
    console.error('[creators] conversion insert failed', error.message)
  }
}

/** How many attributed accounts went paid — the number the paid tier will be built on. */
export async function countCreatorConversions(
  supabase: SupabaseClient,
  creatorId: string
): Promise<number> {
  const { count } = await supabase
    .from('creator_conversions')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('event', 'subscription.active')
  return count ?? 0
}
