import { createServiceClient } from '@/lib/supabase-server'

/**
 * Returns the user's username, or null. Routes use this to enforce the
 * "pick a username before contributing" rule with a consistent error.
 */
export async function getUserUsername(userId: string): Promise<string | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()
  return (data?.username as string | null) ?? null
}

/** Count how many posts a user created in the last 24h (rate limiting). */
export async function postsInLast24h(userId: string): Promise<number> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', since)
  return count ?? 0
}

/**
 * Comments in the last 24h. Comments had no daily cap while posts (25),
 * questions (20) and notes (10) all did — so a loop of "@victim" comments was
 * the one unbounded way to generate notifications and emails (code review
 * 2026-09-25, §2 Community — mention spam).
 */
export async function commentsInLast24h(userId: string): Promise<number> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('community_comments')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', since)
  return count ?? 0
}
