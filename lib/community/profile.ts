import { createServiceClient } from '@/lib/supabase-server'
import { normalizeUsername } from '@/lib/community/username'

export type PublicProfile = {
  id: string
  username: string
  bio: string | null
  reputation: number
  avatarUrl: string | null
  createdAt: string | null
  postCount: number
  flair: string | null
  topSubjects: { subjectCode: string; reputation: number }[]
}

async function enrich(row: {
  id: string
  username: string | null
  bio: string | null
  reputation: number | null
  avatar_url: string | null
  created_at: string | null
  flair: string | null
}): Promise<PublicProfile | null> {
  if (!row.username) return null
  const admin = createServiceClient()
  const [{ count }, { data: reps }] = await Promise.all([
    admin
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', row.id)
      .eq('status', 'published'),
    admin
      .from('community_subject_reputation')
      .select('subject_code, reputation')
      .eq('user_id', row.id)
      .order('reputation', { ascending: false })
      .limit(5),
  ])
  return {
    id: row.id,
    username: row.username,
    bio: row.bio ?? null,
    reputation: row.reputation ?? 0,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at ?? null,
    postCount: count ?? 0,
    flair: row.flair ?? null,
    topSubjects: (reps ?? []).map((r) => ({
      subjectCode: r.subject_code as string,
      reputation: r.reputation as number,
    })),
  }
}

/** Public profile by user id (service role; only safe fields). */
export async function getProfileById(userId: string): Promise<PublicProfile | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username, bio, reputation, avatar_url, created_at, flair')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return enrich(data)
}

/** Look up a public profile by @username (service role; only safe fields). */
export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username, bio, reputation, avatar_url, created_at, flair')
    .eq('username', normalizeUsername(username))
    .maybeSingle()
  if (!data || !data.username) return null
  return enrich(data)
}
