import type { SubscriptionTier } from '@/lib/database.types'
import type { EffectiveAccess } from './access'
import { capForTier, omniCapForTier, tierMarketingName } from './caps'

export type BillingSummaryClient = {
  signedIn: boolean
  tier: SubscriptionTier
  /** Derived access level used for content gating. */
  access: EffectiveAccess
  status: string
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
  if (!summary.signedIn || !summary.questions) {
    return { text: '', tone: 'normal', disableSubmit: false }
  }

  const q = summary.questions
  const tierLabel = summary.tier === 'free' ? 'free' : tierMarketingName(summary.tier)

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
    const nearCap = q.remaining <= Math.ceil(q.cap * 0.2)
    // Paid users: hide the per-mark countdown during normal use so marking feels
    // unlimited. Only surface a gentle heads-up once they're genuinely near the
    // monthly cap (caps stay enforced server-side). Free users always see the
    // countdown — it's the upgrade driver.
    if (summary.tier !== 'free' && !nearCap) {
      return { text: '', tone: 'normal', disableSubmit: false }
    }
    const poolLabel =
      summary.tier === 'free'
        ? `${q.cap} free questions`
        : `${q.cap} monthly questions`
    const after = Math.max(0, q.remaining - 1)
    const prefix =
      summary.tier === 'free'
        ? `This will use 1 of your ${poolLabel}.`
        : `You're approaching your ${q.cap} monthly questions.`
    return {
      text: `${prefix} You'll have ${after} left after this.`,
      tone: nearCap ? 'warning' : 'normal',
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

  if (summary.enforcement_mode === 'warn') {
    const pool =
      summary.tier === 'free' ? `${q.cap} free questions` : `${q.cap} monthly questions`
    return {
      text: `You've used all ${pool} this month. You can still submit while we're in warning mode — upgrade or top up credits soon.`,
      tone: 'warning',
      disableSubmit: false,
    }
  }

  return {
    text: `You've used your ${q.cap} ${tierLabel.toLowerCase()} questions this month.`,
    tone: 'warning',
    disableSubmit: false,
  }
}

export function wholePaperUsageMessage(summary: BillingSummaryClient): string {
  if (!summary.signedIn || !summary.questions) {
    return 'This whole paper will use 1 question (regardless of how many sub-questions it contains).'
  }

  const q = summary.questions
  const nearCap = q.remaining <= Math.ceil(q.cap * 0.2)
  const base =
    'This whole paper will use 1 question (regardless of how many sub-questions it contains).'
  if (q.remaining > 0) {
    // Paid users with comfortable headroom: no countdown (see questionUsageMessage).
    if (summary.tier !== 'free' && !nearCap) return ''
    return `${base} You'll have ${Math.max(0, q.remaining - 1)} left after this.`
  }
  if (summary.credit_balance > 0) {
    return `${base} This will use 1 credit (${summary.credit_balance - 1} credits left after).`
  }
  if (summary.enforcement_mode === 'warn') {
    return `${base} You're over your monthly cap — warning mode still allows submission.`
  }
  return base
}

export function tierQuestionCap(tier: SubscriptionTier): number {
  return capForTier(tier)
}

export function tierOmniCap(tier: SubscriptionTier): number {
  return omniCapForTier(tier)
}

/** Pre-submit copy for Omni chat input. */
export function omniUsageMessage(summary: BillingSummaryClient): {
  text: string
  tone: 'normal' | 'warning' | 'error'
  disableSubmit: boolean
} {
  const o = summary.omni

  if (o.blocked && summary.enforcement_mode === 'enforce') {
    const reset = summary.period_resets_at
      ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        })
      : null
    return {
      text: reset
        ? `You've used all ${o.cap} study chat messages this month (resets ${reset}). Upgrade or top up credits to continue.`
        : `You've used all ${o.cap} study chat messages this month. Upgrade or top up credits to continue.`,
      tone: 'error',
      disableSubmit: true,
    }
  }

  if (summary.enforcement_mode === 'warn' && o.remaining <= 0 && summary.credit_balance <= 0) {
    return {
      text: `You've used all ${o.cap} study chat messages this month. Warning mode still allows chat — upgrade or top up soon.`,
      tone: 'warning',
      disableSubmit: false,
    }
  }

  if (o.warning) {
    return {
      text: `${o.used} of ${o.cap} study chat messages used this month — ${o.remaining} left.`,
      tone: 'warning',
      disableSubmit: false,
    }
  }

  if (summary.enforcement_mode !== 'off') {
    return {
      text: `${o.remaining} study chat messages left this month.`,
      tone: 'normal',
      disableSubmit: false,
    }
  }

  return { text: '', tone: 'normal', disableSubmit: false }
}

/**
 * Post-mark note when a multi-question script ran past the allowance.
 *
 * Two outcomes, told apart honestly:
 *
 *  - `questions_not_marked` > 0: the script was CUT to the allowance before
 *    marking (maxQuestionsForReservation). The first N questions were marked
 *    and counted; the rest were not marked at all, so the note says how many
 *    are still waiting and what unlocks them.
 *  - `marks_refused` > 0 only: the older backstop — every question was
 *    marked, the cap was found reached when the extras were recorded, and
 *    the remainder were not charged. Nothing failed; the note says how the
 *    upload was counted and that the next one this size will be refused.
 *
 * Null when neither applies, so callers render nothing.
 */
export function allowanceRefusedNote(
  block:
    | { marks_charged?: number; marks_refused?: number; questions_not_marked?: number }
    | null
    | undefined
): string | null {
  const charged = Math.max(1, Math.floor(block?.marks_charged ?? 1))
  const notMarked = block?.questions_not_marked ?? 0
  if (Number.isFinite(notMarked) && notMarked > 0) {
    const questions = charged + Math.floor(notMarked)
    const left = Math.floor(notMarked)
    return `This script had ${questions} questions but only ${charged} mark${
      charged === 1 ? '' : 's'
    } ${charged === 1 ? 'was' : 'were'} left in your allowance, so the first ${charged} ${
      charged === 1 ? 'was' : 'were'
    } marked. The other ${left} ${left === 1 ? 'was' : 'were'} not — upload ${
      left === 1 ? 'it' : 'them'
    } again when your allowance resets, or add credits.`
  }
  const refused = block?.marks_refused ?? 0
  if (!Number.isFinite(refused) || refused <= 0) return null
  const questions = charged + refused
  return `This script had ${questions} questions but only ${charged} mark${
    charged === 1 ? '' : 's'
  } ${charged === 1 ? 'was' : 'were'} left in your allowance — every question is marked this time, but the next upload this size will need more marks.`
}
