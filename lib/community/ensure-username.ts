import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { validateUsername } from '@/lib/community/username'
import { generateUsername } from '@/lib/community/username-generate'

export type EnsuredUsername = {
  username: string | null
  /** True when this call created the handle — the caller should say so. */
  assigned: boolean
}

/**
 * The user's username, assigning one if they do not have it yet.
 *
 * Contributing used to hard-stop on "choose a username first" — a second form
 * after signing in, at the exact moment someone had already written their
 * comment. 156 of 168 accounts never cleared it. Since AU-01 keeps the field
 * off the signup form, the honest way to close the gap is to give them a handle
 * and tell them what it is; ProfileSection lets them change it whenever they
 * like.
 *
 * `assigned` exists so the caller can tell them. Silently attaching a public
 * name to somebody's first post would be the wrong kind of frictionless.
 *
 * username is null only if assignment genuinely failed, so callers can still
 * refuse to write a post with no author name attached.
 */
export async function ensureUsername(userId: string): Promise<EnsuredUsername> {
  const admin = createServiceClient()

  const { data: existing } = await admin
    .from('user_profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  const current = (existing?.username as string | null) ?? null
  if (current) return { username: current, assigned: false }

  // The unique index is the real arbiter — checking availability first would
  // still race two concurrent first-comments against each other. Try, and let a
  // duplicate send us round again.
  for (let attempt = 0; attempt < 6; attempt++) {
    const next = generateUsername()
    // Cheap guard against a wordlist edit that breaks the format rules.
    if (!validateUsername(next).ok) continue

    const { error } = await admin
      .from('user_profiles')
      .upsert(
        { id: userId, username: next, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

    if (!error) return { username: next, assigned: true }
    // 23505 = unique_violation: that handle just went to someone else.
    if (error.code !== '23505') {
      console.error('[community/ensure-username] assign failed:', error)
      return { username: null, assigned: false }
    }
  }

  console.error('[community/ensure-username] exhausted attempts for', userId)
  return { username: null, assigned: false }
}
