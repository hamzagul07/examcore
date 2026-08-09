import { capForTier } from '@/lib/billing/caps'

/**
 * Trust copy for the purchase surface (PR-01).
 * Sourced from the same monthly caps the matrix and enforcement use — never “unlimited.”
 */
export function pricingSeoDescription(): string {
  const free = capForTier('free')
  const pro = capForTier('student')
  const scholar = capForTier('scholar')
  const max = capForTier('mastery')
  return `Free courses forever. Monthly marking allowances: Free ${free}, Pro ${pro}, Scholar ${scholar}, Max ${max} questions — renew each month.`
}

export function pricingPlanAllowanceLine(
  tier: 'free' | 'student' | 'scholar' | 'mastery'
): string {
  return `${capForTier(tier)} questions marked / month`
}
