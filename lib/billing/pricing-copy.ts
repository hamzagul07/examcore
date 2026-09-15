import { capForTier } from '@/lib/billing/caps'

/**
 * Trust copy for the purchase surface (PR-01).
 * Sourced from the same monthly caps the matrix and enforcement use — never “unlimited.”
 */
/**
 * Must fit META_DESC_MAX (160) — lib/seo/on-page.ts drops anything longer, and
 * every other entry in page-meta.ts is hand-tuned to 151-158. Naming Starter
 * naively pushed this to 216, which cut the snippet mid-way through Max and
 * lost "free courses forever" — the free hook — from the SERP entirely.
 *
 * It also no longer says "marked twice over". Free single-question marks
 * already run the verify pass (markSingleQuestion defaults verify = true), so
 * that was selling something the free tier already has.
 */
export function pricingSeoDescription(): string {
  const max = capForTier('mastery')
  const starter = capForTier('student')
  return `Free to feel the first examiner stamp. Starter — ${starter} marks/mo. Scholar for whole papers and courses. Max (${max}/mo) — Vault, Cinema, coach.`
}

export function pricingPlanAllowanceLine(
  tier: 'free' | 'student' | 'scholar' | 'mastery'
): string {
  return `${capForTier(tier)} questions marked / month`
}
