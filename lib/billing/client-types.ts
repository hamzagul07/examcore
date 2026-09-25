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
  /** Marks this upload counted as (1 + extra questions recorded). */
  marks_charged?: number
  /**
   * Extra questions of a multi-question script that were marked but not
   * charged because they sat beyond the cap ('enforce' mode). The mark is
   * never failed for this; the page tells the student the script was bigger
   * than what was left.
   */
  marks_refused?: number
  /**
   * Questions of a multi-question script that were NOT marked because the
   * allowance could not cover them. Cut before marking, so nothing was spent
   * on them and nothing is charged for them; the page says which were left.
   */
  questions_not_marked?: number
}

/** Body of a 402 mark_quota_exceeded response. */
export type QuotaExceeded = {
  error: 'mark_quota_exceeded'
  reason?: string
  tier: SubscriptionTier
  /** The cap actually enforced, reported rather than derived from `tier`. */
  cap?: number
  period_resets_at: string | null
  credit_balance: number
  upgrade_url: string
}
