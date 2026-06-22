import { createServiceClient } from '@/lib/supabase-server'
import { normalizeUsername } from '@/lib/community/username'

export type PublicProfile = {
  id: string
  username: string
  bio: string | null
  reputation: number
  avatarUrl: string | null
}

/** Look up a public profile by @username (service role; only safe fields). */
export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username, bio, reputation, avatar_url')
    .eq('username', normalizeUsername(username))
    .maybeSingle()
  if (!data || !data.username) return null
  return {
    id: data.id,
    username: data.username,
    bio: data.bio ?? null,
    reputation: data.reputation ?? 0,
    avatarUrl: data.avatar_url ?? null,
  }
}
