import type { SubscriptionTier } from '@/lib/database.types'

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== 'free'
}

export type PaidFeature = 'whole_paper' | 'mastery_dashboard'

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
