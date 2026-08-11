import type { EffectiveAccess } from './access'

/**
 * Manual entitlement grants ("comps").
 *
 * A tier sometimes gets sold before it is finished. The fair thing is to hand
 * those early subscribers the fuller experience while it is built, and the
 * wrong way to do that is to edit `user_subscriptions.tier` — they pay for
 * Scholar, so recording them as Max would misreport revenue and churn. Billing
 * stays truthful; entitlement is granted separately here.
 *
 * Env rather than a column on purpose: a comp is meant to be temporary. This
 * one expires when Scholar is finished, and an env var makes that removal a
 * one-line change with an audit trail in the deployment, instead of a row
 * somebody has to remember to clean up.
 *
 *   ACCESS_COMP_MAX="uuid,uuid"    → these users get Max-level access
 *
 * Grants only ever *floor* access — a comped user who is already on Max keeps
 * Max, and a comp never downgrades anyone.
 */

function idsFrom(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

/** The access level this user is comped to, if any. */
export function compedAccess(userId: string | null | undefined): EffectiveAccess | null {
  if (!userId) return null
  const id = userId.trim().toLowerCase()
  if (idsFrom(process.env.ACCESS_COMP_MAX).has(id)) return 'max'
  return null
}
