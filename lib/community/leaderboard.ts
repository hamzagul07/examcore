import { createServiceClient } from '@/lib/supabase-server'

export type LeaderboardEntry = {
  rank: number
  userId: string
  username: string | null
  reputation: number
}

export async function getSubjectLeaderboard(
  subjectCode: string,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_subject_reputation')
    .select('user_id, reputation, user_profiles(username)')
    .eq('subject_code', subjectCode)
    .order('reputation', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row, i) => {
    const profile = row.user_profiles as { username?: string | null } | null
    return {
      rank: i + 1,
      userId: row.user_id as string,
      username: profile?.username ?? null,
      reputation: row.reputation as number,
    }
  })
}

export async function getSubjectReputations(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_subject_reputation')
    .select('subject_code, reputation')
    .eq('user_id', userId)
    .order('reputation', { ascending: false })
  return (data ?? []).map((r) => ({
    subjectCode: r.subject_code as string,
    reputation: r.reputation as number,
  }))
}
