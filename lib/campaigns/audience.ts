import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'

/**
 * Named audiences for broadcast campaigns.
 *
 * Segments are resolved at send time rather than snapshotted, so a campaign
 * always reflects the current opt-out state: someone who unsubscribes between
 * a campaign being written and being sent is simply not in the list.
 *
 * The consent rule each segment follows is stated on the segment, because it
 * is the part that is easy to get wrong and expensive to get wrong. Two
 * different opt-outs exist and they are not interchangeable:
 *
 *   email_product_updates — marketing. Newsletter, feature announcements,
 *     anything promotional. Opt-IN: false unless the student said yes.
 *   email_activation      — lifecycle. "Your account is set up and unused."
 *     Opt-OUT: true unless the student turned it off.
 */

export type Recipient = {
  userId: string
  email: string
  name: string | null
  /** Their own subjects, so a campaign can name them instead of guessing. */
  subjects: string[]
}

export type SegmentId =
  | 'updates_opted_in'
  | 'never_marked'
  | 'active_markers'
  | 'paying'
  | 'repermission'
  | 'cambridge_results'

export type Segment = {
  id: SegmentId
  /** Shown in the CLI before anything sends. */
  description: string
  /** Which unsubscribe kind the resulting email must carry. */
  unsubscribeKind: 'updates' | 'activation'
  resolve: () => Promise<Recipient[]>
}

type AuthUser = { id: string; email: string; confirmed: boolean }

/**
 * Every confirmed address in one pass.
 *
 * listUsers is paginated; the alternative is getUserById per profile, which is
 * one network round trip per user and takes minutes at a few hundred accounts.
 */
async function loadAuthUsers(): Promise<Map<string, AuthUser>> {
  const admin = createServiceClient()
  const byId = new Map<string, AuthUser>()
  const perPage = 1000

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const users = data?.users ?? []
    for (const u of users) {
      if (!u.email) continue
      byId.set(u.id, {
        id: u.id,
        email: u.email,
        confirmed: Boolean(u.email_confirmed_at),
      })
    }
    if (users.length < perPage) break
  }
  return byId
}

/** Profile rows joined to a confirmed address. Unconfirmed addresses bounce. */
async function profilesWith(
  filter: (q: ReturnType<typeof profileQuery>) => ReturnType<typeof profileQuery>
): Promise<{ rows: ProfileRow[]; users: Map<string, AuthUser> }> {
  const { data, error } = await filter(profileQuery())
  if (error) throw new Error(`audience query failed: ${error.message}`)
  const users = await loadAuthUsers()
  return { rows: (data ?? []) as ProfileRow[], users }
}

type ProfileRow = {
  id: string
  full_name: string | null
  email_product_updates: boolean | null
  email_activation: boolean | null
  subjects: string[] | null
  onboarded: boolean | null
  board: string | null
}

function profileQuery() {
  return createServiceClient()
    .from('user_profiles')
    .select('id, full_name, email_product_updates, email_activation, onboarded, board, subjects')
}

function toRecipients(rows: ProfileRow[], users: Map<string, AuthUser>): Recipient[] {
  const out: Recipient[] = []
  for (const r of rows) {
    const u = users.get(r.id)
    if (!u || !u.confirmed) continue
    out.push({ userId: r.id, email: u.email, name: r.full_name, subjects: r.subjects ?? [] })
  }
  return out
}

/** User ids with at least one attempt, optionally within a window. */
async function markerIds(sinceIso?: string): Promise<Set<string>> {
  const admin = createServiceClient()
  let q = admin.from('attempts').select('user_id').not('user_id', 'is', null)
  if (sinceIso) q = q.gte('created_at', sinceIso)
  const { data, error } = await q
  if (error) throw new Error(`attempts query failed: ${error.message}`)
  return new Set((data ?? []).map((r) => r.user_id as string))
}

export const SEGMENTS: Record<SegmentId, Segment> = {
  updates_opted_in: {
    id: 'updates_opted_in',
    description: 'Opted in to product updates. The newsletter list.',
    unsubscribeKind: 'updates',
    resolve: async () => {
      const { rows, users } = await profilesWith((q) => q.eq('email_product_updates', true))
      return toRecipients(rows, users)
    },
  },

  cambridge_results: {
    id: 'cambridge_results',
    description:
      'Cambridge students, results week. Timing + deadlines they need — lifecycle, not marketing.',
    unsubscribeKind: 'activation',
    resolve: async () => {
      const { rows, users } = await profilesWith((q) =>
        q
          .eq('board', 'Cambridge International')
          .eq('onboarded', true)
          .neq('email_activation', false)
      )
      return toRecipients(rows, users)
    },
  },

  never_marked: {
    id: 'never_marked',
    description:
      'Finished onboarding, has never marked anything. Re-engagement — lifecycle, not marketing.',
    unsubscribeKind: 'activation',
    resolve: async () => {
      const { rows, users } = await profilesWith((q) =>
        q.eq('onboarded', true).neq('email_activation', false)
      )
      const marked = await markerIds()
      return toRecipients(
        rows.filter((r) => !marked.has(r.id)),
        users
      )
    },
  },

  active_markers: {
    id: 'active_markers',
    description: 'Marked something in the last 30 days, and opted in to updates.',
    unsubscribeKind: 'updates',
    resolve: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const { rows, users } = await profilesWith((q) => q.eq('email_product_updates', true))
      const recent = await markerIds(since)
      return toRecipients(
        rows.filter((r) => recent.has(r.id)),
        users
      )
    },
  },

  paying: {
    id: 'paying',
    description: 'Active paid subscribers who opted in to updates.',
    unsubscribeKind: 'updates',
    resolve: async () => {
      const admin = createServiceClient()
      const { data: subs, error } = await admin
        .from('user_subscriptions')
        .select('user_id, tier, status')
        .neq('tier', 'free')
        .in('status', ['active', 'trialing', 'past_due'])
      if (error) throw new Error(`subscriptions query failed: ${error.message}`)
      const paid = new Set((subs ?? []).map((s) => s.user_id as string))
      const { rows, users } = await profilesWith((q) => q.eq('email_product_updates', true))
      return toRecipients(
        rows.filter((r) => paid.has(r.id)),
        users
      )
    },
  },

  /**
   * One-time re-permission ask.
   *
   * This is the only segment that mails people who have NOT opted in, and it
   * exists because the opt-in question was added after they signed up — 1 of
   * 152 had ever been asked. It is a preferences email: it offers a choice and
   * sells nothing, and anyone who ignores it stays opted out, which is the
   * outcome that needs no consent.
   *
   * Use it once. The campaign_sends primary key enforces that within a
   * campaign; using this segment for a second campaign would be mailing
   * non-consenting people twice, which is what the rule exists to prevent.
   */
  repermission: {
    id: 'repermission',
    description:
      'ONE-TIME ONLY: confirmed accounts that have never answered the product-updates question.',
    unsubscribeKind: 'updates',
    resolve: async () => {
      const { rows, users } = await profilesWith((q) => q.neq('email_product_updates', true))
      return toRecipients(rows, users)
    },
  },
}

export function getSegment(id: string): Segment | null {
  return (SEGMENTS as Record<string, Segment>)[id] ?? null
}
