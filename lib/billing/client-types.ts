import type { SubscriptionTier } from '@/lib/database.types'

/** The `_allowance` block attached to successful marking responses. */
export type AllowanceBlock = {
  warning: boolean
  remaining_after: number
  cap: number
  tier: SubscriptionTier
  credit_balance: number
  period_resets_at: string | null
  enforcement_mode: 'off' | 'warn' | 'enforce'
}

/** Body of a 402 mark_quota_exceeded response. */
export type QuotaExceeded = {
  error: 'mark_quota_exceeded'
  reason?: string
  tier: SubscriptionTier
  period_resets_at: string | null
  credit_balance: number
  upgrade_url: string
}
