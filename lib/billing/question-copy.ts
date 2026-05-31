import type { SubscriptionTier } from '@/lib/database.types'
import { capForTier, omniCapForTier } from './caps'

export type BillingSummaryClient = {
  signedIn: boolean
  tier: SubscriptionTier
  status: string
  founding_member: boolean
  credit_balance: number
  period_resets_at: string | null
  enforcement_mode: 'off' | 'warn' | 'enforce'
  questions: {
    used: number
    cap: number
    remaining: number
    warning: boolean
    blocked: boolean
  }
  omni: {
    used: number
    cap: number
    remaining: number
    warning: boolean
    blocked: boolean
  }
}

/** Pre-submit copy for single-question marking. */
export function questionUsageMessage(summary: BillingSummaryClient): {
  text: string
  tone: 'normal' | 'warning' | 'error'
  disableSubmit: boolean
} {
  const q = summary.questions
  const tierLabel =
    summary.tier === 'free'
      ? 'free'
      : `${summary.tier.charAt(0).toUpperCase()}${summary.tier.slice(1)}`

  if (q.blocked && summary.enforcement_mode === 'enforce') {
    const reset = summary.period_resets_at
      ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        })
      : null
    const scope =
      summary.tier === 'free' ? `${q.cap} free questions` : `${q.cap} monthly questions`
    return {
      text: reset
        ? `You've used all your ${scope} this month. Top up credits or upgrade your plan. Your questions reset on ${reset}.`
        : `You've used all your ${scope} this month. Top up credits or upgrade your plan.`,
      tone: 'error',
      disableSubmit: true,
    }
  }

  if (q.remaining > 0) {
    const poolLabel =
      summary.tier === 'free'
        ? `${q.cap} free questions`
        : `${q.cap} monthly questions`
    const after = Math.max(0, q.remaining - 1)
    const prefix =
      summary.tier === 'free'
        ? `This will use 1 of your ${poolLabel}.`
        : `This will use 1 of your ${q.cap} monthly questions.`
    return {
      text: `${prefix} You'll have ${after} left after this.`,
      tone: q.remaining <= Math.ceil(q.cap * 0.2) ? 'warning' : 'normal',
      disableSubmit: false,
    }
  }

  if (summary.credit_balance > 0) {
    const afterCredits = summary.credit_balance - 1
    const pool =
      summary.tier === 'free' ? `${q.cap} free questions` : `${q.cap} monthly questions`
    return {
      text: `You've used your ${pool}. This will use 1 credit. You'll have ${afterCredits} credit${afterCredits === 1 ? '' : 's'} left after this.`,
      tone: 'warning',
      disableSubmit: false,
    }
  }

  return {
    text: `You've used your ${q.cap} ${tierLabel.toLowerCase()} questions this month. This will still submit while limits are soft.`,
    tone: 'warning',
    disableSubmit: false,
  }
}

export function wholePaperUsageMessage(summary: BillingSummaryClient): string {
  return 'This whole paper will use 1 question (regardless of how many sub-questions it contains).'
}

export function tierQuestionCap(tier: SubscriptionTier): number {
  return capForTier(tier)
}

export function tierOmniCap(tier: SubscriptionTier): number {
  return omniCapForTier(tier)
}
