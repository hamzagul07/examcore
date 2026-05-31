// NOTE: server-only module. Imports the Supabase service-role client, so it
// must never be bundled into client components. Marking routes + summary API
// are the only callers.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getEnforcementMode,
  shouldBlockAtCap,
  shouldShowApproachingLimitBanner,
  type EnforcementMode,
} from './enforcement-mode'
import { capForTier, currentPeriodWindow, isUnlimited, TIER_MONTHLY_CAPS } from './caps'
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

export { TIER_MONTHLY_CAPS }

export type MarkEventType = 'mark_single' | 'mark_whole_paper'
export type AllowanceReason =
  | 'free_tier_cap'
  | 'student_cap'
  | 'no_credits'
  | 'subscription_inactive'

export type MarkAllowance = {
  allowed: boolean
  blocked_by_mode: boolean // would have been blocked in 'enforce' mode
  reason?: AllowanceReason
  remaining: number // Infinity for unlimited
  marks_used: number
  cap: number // Infinity for unlimited
  credit_balance: number
  tier: SubscriptionTier
  status: SubscriptionStatus
  period_resets_at?: string
  founding_member: boolean
  warning: boolean // true at 80%+ of cap (banner gate handled separately)
  enforcement_mode: EnforcementMode
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

async function countMarksInWindow(
  supabase: SupabaseClient,
  userId: string,
  source: 'subscription' | 'free_tier',
  start: string,
  end: string | null
): Promise<number> {
  let q = supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', source)
    .in('event_type', ['mark_single', 'mark_whole_paper'])
    .gte('created_at', start)
  if (end) q = q.lt('created_at', end)
  const { count } = await q
  return count ?? 0
}

/**
 * Pure read of the user's current allowance. NO side effects (does not write to
 * the shadow log) — safe to call from the header summary endpoint on every
 * page/refetch. Marking routes use `checkMarkAllowance` instead, which adds
 * shadow logging.
 */
export async function computeAllowance(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<MarkAllowance> {
  const [{ data: sub }, { data: credits }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('tier, status, current_period_start, current_period_end, founding_member')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_credits').select('balance').eq('user_id', userId).maybeSingle(),
  ])

  const tier = (sub?.tier ?? 'free') as SubscriptionTier
  const status = (sub?.status ?? 'active') as SubscriptionStatus
  const founding_member = Boolean(sub?.founding_member)
  const credit_balance = credits?.balance ?? 0

  const window = currentPeriodWindow({
    tier,
    periodStart: sub?.current_period_start,
    periodEnd: sub?.current_period_end,
  })

  const cap = capForTier(tier)
  const unlimited = isUnlimited(tier)
  const marks_used = unlimited
    ? 0
    : await countMarksInWindow(supabase, userId, window.source, window.start, window.end)

  const remaining = unlimited ? Infinity : Math.max(0, cap - marks_used)
  const subscriptionInactive = tier !== 'free' && !ACTIVE_STATUSES.includes(status)
  const atCap = !unlimited && marks_used >= cap

  let would_block = false
  let reason: AllowanceReason | undefined
  if (subscriptionInactive && credit_balance <= 0) {
    would_block = true
    reason = 'subscription_inactive'
  } else if (atCap && credit_balance <= 0) {
    would_block = true
    reason = tier === 'free' ? 'free_tier_cap' : 'student_cap'
  }

  const warning = !unlimited && cap > 0 && marks_used >= 0.8 * cap

  const mode = getEnforcementMode()
  const blocked_by_mode = would_block && shouldBlockAtCap()
  const allowed = mode === 'enforce' ? !would_block : true

  return {
    allowed,
    blocked_by_mode,
    reason,
    remaining,
    marks_used,
    cap,
    credit_balance,
    tier,
    status,
    period_resets_at: window.end ?? undefined,
    founding_member,
    warning,
    enforcement_mode: mode,
  }
}

async function recordShadowEvent(
  supabase: SupabaseClient,
  userId: string,
  allowance: MarkAllowance
): Promise<void> {
  const atCap = Number.isFinite(allowance.cap) && allowance.marks_used >= allowance.cap

  let eventType: 'would_warn' | 'would_block' | 'allowed_via_credits' | null = null
  if (allowance.blocked_by_mode || allowance.reason) {
    // would_block: a real cap/inactive hit (reason set). In enforce mode this is
    // an actual block; in off/warn it's a "would have blocked".
    eventType = 'would_block'
  } else if (atCap && allowance.credit_balance > 0) {
    eventType = 'allowed_via_credits'
  } else if (allowance.warning) {
    eventType = 'would_warn'
  }
  if (!eventType) return

  const { error } = await supabase.from('shadow_enforcement_log').insert({
    user_id: userId,
    event_type: eventType,
    reason: allowance.reason ?? null,
    tier: allowance.tier,
    marks_used: allowance.marks_used,
    mark_cap: Number.isFinite(allowance.cap) ? allowance.cap : 2147483647,
    credit_balance: allowance.credit_balance,
    enforcement_mode: allowance.enforcement_mode,
    metadata: { remaining: Number.isFinite(allowance.remaining) ? allowance.remaining : null },
  })
  if (error) console.error('[enforcement] shadow log insert failed:', error.message)
}

/**
 * Allowance check for marking routes. Computes the real picture in EVERY mode
 * and records a shadow-log row when relevant (would_block / would_warn /
 * allowed_via_credits). The caller decides what to do based on
 * `blocked_by_mode`.
 */
export async function checkMarkAllowance(userId: string): Promise<MarkAllowance> {
  const supabase = createServiceClient()
  const allowance = await computeAllowance(userId, supabase)
  // Fire-and-forget shadow log — never block marking on logging failure.
  await recordShadowEvent(supabase, userId, allowance)
  return allowance
}

/**
 * Record a SUCCESSFUL mark. Failed marks never call this. Whole-paper counts as
 * exactly 1 event. Chooses the source:
 *   - within tier cap / unlimited  -> source='subscription' | 'free_tier'
 *   - over cap (or inactive sub) with credits -> consume_credit RPC (source='credits')
 *   - over cap with no credits (off/warn mode let it through) -> tier source so
 *     metering still reflects reality.
 */
export async function recordMarkUsage(
  userId: string,
  attemptId: string | null,
  eventType: MarkEventType
): Promise<void> {
  const supabase = createServiceClient()
  const allowance = await computeAllowance(userId, supabase)

  const atCapOrInactive =
    (Number.isFinite(allowance.cap) && allowance.marks_used >= allowance.cap) ||
    (allowance.tier !== 'free' && !ACTIVE_STATUSES.includes(allowance.status))

  if (atCapOrInactive && allowance.credit_balance > 0) {
    const { data: spent, error } = await supabase.rpc('consume_credit', {
      p_user_id: userId,
      p_event_type: eventType,
      p_attempt_id: attemptId,
      p_metadata: { recorded_at: new Date().toISOString() },
    })
    if (error) {
      console.error('[enforcement] consume_credit failed:', error.message)
    } else if (spent === true) {
      return // credit spent + usage_events row inserted by the RPC
    }
    // spent === false (race: credits gone) → fall through to tier-source record
  }

  const source = allowance.tier === 'free' ? 'free_tier' : 'subscription'

  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: eventType,
    attempt_id: attemptId,
    credits_delta: -1,
    source,
    metadata: { recorded_at: new Date().toISOString() },
  })
  if (error) console.error('[enforcement] recordMarkUsage insert failed:', error.message)
}

/** Serialize remaining/cap (Infinity -> null) for JSON. */
function jsonNum(n: number): number | null {
  return Number.isFinite(n) ? n : null
}

/**
 * `_allowance` block attached to successful marking responses. `warning` is only
 * surfaced when the banner is enabled (warn/enforce) — in `off` mode it's always
 * false so the client shows nothing.
 */
export function allowanceForResponse(allowance: MarkAllowance) {
  const remainingAfter = Number.isFinite(allowance.remaining)
    ? Math.max(0, allowance.remaining - 1)
    : null
  return {
    warning: allowance.warning && shouldShowApproachingLimitBanner(),
    remaining_after: remainingAfter,
    cap: jsonNum(allowance.cap),
    tier: allowance.tier,
    credit_balance: allowance.credit_balance,
    period_resets_at: allowance.period_resets_at ?? null,
    enforcement_mode: allowance.enforcement_mode,
  }
}

/** 402 body for a cap breach (only sent in enforce mode). */
export function quotaExceededBody(allowance: MarkAllowance) {
  return {
    error: 'mark_quota_exceeded' as const,
    reason: allowance.reason,
    tier: allowance.tier,
    period_resets_at: allowance.period_resets_at ?? null,
    credit_balance: allowance.credit_balance,
    upgrade_url: '/pricing',
  }
}

export { shouldShowApproachingLimitBanner }
