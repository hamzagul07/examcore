// NOTE: server-only module. Imports the Supabase service-role client, so it
// must never be bundled into client components.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getEnforcementMode,
  shouldBlockAtCap,
  shouldShowApproachingLimitBanner,
  type EnforcementMode,
} from './enforcement-mode'
import {
  capForTier,
  currentPeriodWindow,
  omniCapForTier,
  TIER_MONTHLY_CAPS,
  TIER_OMNI_CAPS,
} from './caps'
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

export { TIER_MONTHLY_CAPS, TIER_OMNI_CAPS }

export type MarkEventType = 'mark_single' | 'mark_whole_paper'
export type OmniEventType = 'omni_message'
export type UsageEventType = MarkEventType | OmniEventType

export type AllowanceReason =
  | 'free_tier_cap'
  | 'tier_cap'
  | 'omni_cap'
  | 'no_credits'
  | 'subscription_inactive'

export type QuotaAllowance = {
  allowed: boolean
  blocked_by_mode: boolean
  reason?: AllowanceReason
  remaining: number
  used: number
  cap: number
  credit_balance: number
  tier: SubscriptionTier
  status: SubscriptionStatus
  period_resets_at?: string
  founding_member: boolean
  warning: boolean
  enforcement_mode: EnforcementMode
}

/** Mark-specific alias — `marks_used` mirrors `used` for existing callers. */
export type MarkAllowance = QuotaAllowance & { marks_used: number }

export type BillingSummary = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  founding_member: boolean
  credit_balance: number
  period_resets_at?: string
  enforcement_mode: EnforcementMode
  questions: QuotaAllowance
  omni: QuotaAllowance
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

type BillingContext = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  founding_member: boolean
  credit_balance: number
  window: ReturnType<typeof currentPeriodWindow>
  enforcement_mode: EnforcementMode
}

async function loadBillingContext(
  userId: string,
  supabase: SupabaseClient
): Promise<BillingContext> {
  const [{ data: sub }, { data: credits }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('tier, status, current_period_start, current_period_end, founding_member')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_credits').select('balance').eq('user_id', userId).maybeSingle(),
  ])

  const tier = (sub?.tier ?? 'free') as SubscriptionTier
  return {
    tier,
    status: (sub?.status ?? 'active') as SubscriptionStatus,
    founding_member: Boolean(sub?.founding_member),
    credit_balance: credits?.balance ?? 0,
    window: currentPeriodWindow({
      tier,
      periodStart: sub?.current_period_start,
      periodEnd: sub?.current_period_end,
    }),
    enforcement_mode: getEnforcementMode(),
  }
}

async function countUsageInWindow(
  supabase: SupabaseClient,
  userId: string,
  eventTypes: UsageEventType[],
  source: 'subscription' | 'free_tier',
  start: string,
  end: string | null
): Promise<number> {
  let q = supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', source)
    .in('event_type', eventTypes)
    .gte('created_at', start)
  if (end) q = q.lt('created_at', end)
  const { count } = await q
  return count ?? 0
}

function buildQuotaAllowance(
  ctx: BillingContext,
  opts: {
    used: number
    cap: number
    omni?: boolean
  }
): QuotaAllowance {
  const { tier, status, founding_member, credit_balance, window, enforcement_mode } = ctx
  const remaining = Math.max(0, opts.cap - opts.used)
  const subscriptionInactive = tier !== 'free' && !ACTIVE_STATUSES.includes(status)
  const atCap = opts.used >= opts.cap

  let would_block = false
  let reason: AllowanceReason | undefined
  if (subscriptionInactive && credit_balance <= 0) {
    would_block = true
    reason = 'subscription_inactive'
  } else if (atCap && credit_balance <= 0) {
    would_block = true
    reason = opts.omni ? 'omni_cap' : tier === 'free' ? 'free_tier_cap' : 'tier_cap'
  }

  const warning = opts.cap > 0 && opts.used >= 0.8 * opts.cap
  const blocked_by_mode = would_block && shouldBlockAtCap()
  const allowed = enforcement_mode === 'enforce' ? !would_block : true

  return {
    allowed,
    blocked_by_mode,
    reason,
    remaining,
    used: opts.used,
    cap: opts.cap,
    credit_balance,
    tier,
    status,
    period_resets_at: window.end ?? undefined,
    founding_member,
    warning,
    enforcement_mode,
  }
}

function asMarkAllowance(q: QuotaAllowance): MarkAllowance {
  return { ...q, marks_used: q.used }
}

async function computeQuestionAllowanceFromContext(
  userId: string,
  ctx: BillingContext,
  supabase: SupabaseClient
): Promise<QuotaAllowance> {
  const used = await countUsageInWindow(
    supabase,
    userId,
    ['mark_single', 'mark_whole_paper'],
    ctx.window.source,
    ctx.window.start,
    ctx.window.end
  )
  return buildQuotaAllowance(ctx, { used, cap: capForTier(ctx.tier) })
}

async function computeOmniAllowanceFromContext(
  userId: string,
  ctx: BillingContext,
  supabase: SupabaseClient
): Promise<QuotaAllowance> {
  const used = await countUsageInWindow(
    supabase,
    userId,
    ['omni_message'],
    ctx.window.source,
    ctx.window.start,
    ctx.window.end
  )
  return buildQuotaAllowance(ctx, { used, cap: omniCapForTier(ctx.tier), omni: true })
}

/**
 * Pure read of question allowance. Safe for summary endpoint (no shadow log).
 */
export async function computeAllowance(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<MarkAllowance> {
  const ctx = await loadBillingContext(userId, supabase)
  const q = await computeQuestionAllowanceFromContext(userId, ctx, supabase)
  return asMarkAllowance(q)
}

export async function computeOmniAllowance(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<QuotaAllowance> {
  const ctx = await loadBillingContext(userId, supabase)
  return computeOmniAllowanceFromContext(userId, ctx, supabase)
}

/** Combined question + Omni allowances for header chip and account page. */
export async function computeBillingSummary(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<BillingSummary> {
  const ctx = await loadBillingContext(userId, supabase)
  const [questions, omni] = await Promise.all([
    computeQuestionAllowanceFromContext(userId, ctx, supabase),
    computeOmniAllowanceFromContext(userId, ctx, supabase),
  ])
  return {
    tier: ctx.tier,
    status: ctx.status,
    founding_member: ctx.founding_member,
    credit_balance: ctx.credit_balance,
    period_resets_at: ctx.window.end ?? undefined,
    enforcement_mode: ctx.enforcement_mode,
    questions,
    omni,
  }
}

async function recordShadowEvent(
  supabase: SupabaseClient,
  userId: string,
  allowance: QuotaAllowance,
  kind: 'mark' | 'omni'
): Promise<void> {
  const atCap = allowance.used >= allowance.cap

  let eventType: 'would_warn' | 'would_block' | 'allowed_via_credits' | null = null
  if (allowance.blocked_by_mode || allowance.reason) {
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
    marks_used: allowance.used,
    mark_cap: allowance.cap,
    credit_balance: allowance.credit_balance,
    enforcement_mode: allowance.enforcement_mode,
    metadata: { kind, remaining: allowance.remaining },
  })
  if (error) console.error('[enforcement] shadow log insert failed:', error.message)
}

export async function checkMarkAllowance(userId: string): Promise<MarkAllowance> {
  const supabase = createServiceClient()
  const allowance = await computeAllowance(userId, supabase)
  await recordShadowEvent(supabase, userId, allowance, 'mark')
  return allowance
}

export async function checkOmniAllowance(userId: string): Promise<QuotaAllowance> {
  const supabase = createServiceClient()
  const allowance = await computeOmniAllowance(userId, supabase)
  await recordShadowEvent(supabase, userId, allowance, 'omni')
  return allowance
}

async function recordUsageEvent(
  userId: string,
  eventType: UsageEventType,
  attemptId: string | null,
  computeQuota: (userId: string, supabase: SupabaseClient) => Promise<QuotaAllowance>
): Promise<void> {
  const supabase = createServiceClient()
  const allowance = await computeQuota(userId, supabase)

  const atCapOrInactive =
    allowance.used >= allowance.cap ||
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
      return
    }
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
  if (error) console.error('[enforcement] recordUsage insert failed:', error.message)
}

export async function recordMarkUsage(
  userId: string,
  attemptId: string | null,
  eventType: MarkEventType
): Promise<void> {
  await recordUsageEvent(userId, eventType, attemptId, async (uid, sb) => {
    const ctx = await loadBillingContext(uid, sb)
    return computeQuestionAllowanceFromContext(uid, ctx, sb)
  })
}

export async function recordOmniUsage(userId: string): Promise<void> {
  await recordUsageEvent(userId, 'omni_message', null, async (uid, sb) => {
    const ctx = await loadBillingContext(uid, sb)
    return computeOmniAllowanceFromContext(uid, ctx, sb)
  })
}

export function allowanceForResponse(allowance: MarkAllowance) {
  const remainingAfter = Math.max(0, allowance.remaining - 1)
  return {
    warning: allowance.warning && shouldShowApproachingLimitBanner(),
    remaining_after: remainingAfter,
    cap: allowance.cap,
    tier: allowance.tier,
    credit_balance: allowance.credit_balance,
    period_resets_at: allowance.period_resets_at ?? null,
    enforcement_mode: allowance.enforcement_mode,
  }
}

export function quotaExceededBody(allowance: MarkAllowance | QuotaAllowance) {
  return {
    error: 'mark_quota_exceeded' as const,
    reason: allowance.reason,
    tier: allowance.tier,
    period_resets_at: allowance.period_resets_at ?? null,
    credit_balance: allowance.credit_balance,
    upgrade_url: '/pricing',
  }
}

export function omniQuotaExceededBody(allowance: QuotaAllowance) {
  return {
    error: 'omni_quota_exceeded' as const,
    reason: allowance.reason,
    tier: allowance.tier,
    cap: allowance.cap,
    period_resets_at: allowance.period_resets_at ?? null,
    credit_balance: allowance.credit_balance,
    upgrade_url: '/pricing',
  }
}

export { shouldShowApproachingLimitBanner }
