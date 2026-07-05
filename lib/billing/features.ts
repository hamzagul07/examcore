import type { SubscriptionTier } from '@/lib/database.types'
import type { EffectiveAccess } from './access'

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== 'free'
}

/**
 * Trial-aware paid check. Use this (not isPaidTier) for feature gating: the
 * 7-day reverse trial promises full access, and trial users still have
 * tier='free' in the DB.
 */
export function hasPaidAccess(access: EffectiveAccess): boolean {
  return access !== 'free'
}

/**
 * Launch promo: interactive diagrams (the lesson "Explore the concept" visuals)
 * are free for everyone while MarkScheme is new. Flip to `false` to move them
 * back behind Pro/Max — that single change re-gates the lesson section AND
 * updates the pricing page / comparison-matrix copy.
 */
export const INTERACTIVE_DIAGRAMS_FREE = true

/** Max questions marked per whole-paper upload on the free tier (preview). */
export const FREE_WHOLE_PAPER_QUESTION_LIMIT = 3

/** Paid / preview cap for whole-paper segmentation. */
export const WHOLE_PAPER_QUESTION_LIMIT = 15

export type PaidFeature = 'whole_paper' | 'mastery_dashboard'

export function wholePaperQuestionLimit(access: EffectiveAccess): number {
  return hasPaidAccess(access)
    ? WHOLE_PAPER_QUESTION_LIMIT
    : FREE_WHOLE_PAPER_QUESTION_LIMIT
}

export function paidFeatureRequiredBody(feature: PaidFeature) {
  return {
    error: 'paid_feature_required' as const,
    feature,
    message:
      feature === 'whole_paper'
        ? 'Whole papers are a paid feature — upgrade to mark entire papers in one go.'
        : 'Unlock the mastery dashboard with any paid plan.',
    upgrade_url: '/pricing',
  }
}
