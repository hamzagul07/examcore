import 'server-only'

import type { createServiceClient } from '@/lib/supabase-server'
import { effectiveAccess, type EffectiveAccess } from '@/lib/billing/access'
import { compedAccess } from '@/lib/billing/comp'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

type Admin = ReturnType<typeof createServiceClient>

/**
 * Effective access level for a batch of community authors.
 *
 * Resolved live rather than snapshotted onto the post, so a badge disappears
 * when a subscription lapses and appears the moment someone upgrades — a badge
 * that outlives the subscription is worse than no badge.
 *
 * Goes through the same `effectiveAccess` the rest of billing uses, so teacher
 * seats and comps read consistently here and everywhere else.
 */
export async function authorAccessMap(
  admin: Admin,
  ids: string[]
): Promise<Map<string, EffectiveAccess>> {
  const unique = [...new Set(ids)].filter(Boolean)
  const out = new Map<string, EffectiveAccess>()
  if (!unique.length) return out

  const [subs, profiles] = await Promise.all([
    admin.from('user_subscriptions').select('user_id, tier, status').in('user_id', unique),
    admin.from('user_profiles').select('id, teacher_verified_at').in('id', unique),
  ])

  const subByUser = new Map(
    (subs.data ?? []).map((s) => [s.user_id as string, s as { tier: string; status: string }])
  )
  const teacherVerified = new Map(
    (profiles.data ?? []).map((p) => [p.id as string, !!p.teacher_verified_at])
  )

  for (const id of unique) {
    const sub = subByUser.get(id)
    out.set(
      id,
      effectiveAccess({
        // No subscription row yet (the billing trigger runs on signup, but a
        // seeded or legacy account may predate it) reads as free, not as a crash.
        tier: (sub?.tier as SubscriptionTier) ?? 'free',
        status: (sub?.status as SubscriptionStatus) ?? 'canceled',
        teacherVerified: teacherVerified.get(id) ?? false,
        accessOverride: compedAccess(id),
      })
    )
  }

  return out
}
