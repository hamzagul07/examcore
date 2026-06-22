import { createServiceClient } from '@/lib/supabase-server'
import { validateUsername } from '@/lib/community/username'

/**
 * Persist a username chosen at sign-up (stored in auth user_metadata) onto the
 * user_profiles row. Idempotent + safe: no-op if the profile already has a
 * username, or if the desired one is invalid/taken.
 */
export async function claimUsernameFromMetadata(
  userId: string,
  metadataUsername: unknown
): Promise<void> {
  if (typeof metadataUsername !== 'string' || !metadataUsername.trim()) return
  const check = validateUsername(metadataUsername)
  if (!check.ok) return

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.username) return // already set — don't overwrite

  const { data: taken } = await admin
    .from('user_profiles')
    .select('id')
    .eq('username', check.username)
    .neq('id', userId)
    .maybeSingle()
  if (taken) return // someone grabbed it first — user can set another later

  await admin
    .from('user_profiles')
    .upsert(
      { id: userId, username: check.username, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
}
