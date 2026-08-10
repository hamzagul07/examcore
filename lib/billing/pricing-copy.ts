import { capForTier } from '@/lib/billing/caps'

/**
 * Trust copy for the purchase surface (PR-01).
 * Sourced from the same monthly caps the matrix and enforcement use — never “unlimited.”
 */
export function pricingSeoDescription(): string {
  const max = capForTier('mastery')
  return `Free to feel the first examiner stamp. Scholar for whole papers and courses. Max (${max}/mo) — Vault, Cinema, priority marking, Sunday coach. Free courses forever.`
}

export function pricingPlanAllowanceLine(
  tier: 'free' | 'student' | 'scholar' | 'mastery'
): string {
  return `${capForTier(tier)} questions marked / month`
}
