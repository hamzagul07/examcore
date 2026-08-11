import 'server-only'

import type { createServiceClient } from '@/lib/supabase-server'
import { effectiveAccess, type EffectiveAccess } from '@/lib/billing/access'
import { compedAccess } from '@/lib/billing/comp'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

type Admin = ReturnType<typeof createServiceClient>

/** Ids per request. 100 UUIDs is roughly a 4KB query string — comfortable. */
const ID_CHUNK = 100

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

  const subByUser = new Map<string, { tier: string; status: string }>()
  const teacherVerified = new Map<string, boolean>()

  // Chunked because `.in()` becomes a query string: a UUID costs ~38 characters,
  // so a single feed page with a few hundred distinct authors would build a URL
  // past what sits in front of PostgREST and fail the whole request. The feed
  // fetches up to 300 rows, which is already inside that territory.
  for (let i = 0; i < unique.length; i += ID_CHUNK) {
    const batch = unique.slice(i, i + ID_CHUNK)
    const [subs, profiles] = await Promise.all([
      admin.from('user_subscriptions').select('user_id, tier, status').in('user_id', batch),
      admin.from('user_profiles').select('id, teacher_verified_at').in('id', batch),
    ])
    if (subs.error) throw new Error(`author access: subscriptions — ${subs.error.message}`)
    if (profiles.error) throw new Error(`author access: profiles — ${profiles.error.message}`)

    for (const s of subs.data ?? []) {
      subByUser.set(s.user_id as string, s as { tier: string; status: string })
    }
    for (const p of profiles.data ?? []) {
      teacherVerified.set(p.id as string, !!p.teacher_verified_at)
    }
  }

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
