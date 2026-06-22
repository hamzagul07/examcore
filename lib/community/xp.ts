import { createServiceClient } from '@/lib/supabase-server'

export async function awardXp(input: {
  userId: string
  kind: string
  subjectCode?: string | null
  points: number
  refId?: string | null
}) {
  if (!input.points) return
  const admin = createServiceClient()
  await admin.from('xp_events').insert({
    user_id: input.userId,
    kind: input.kind,
    subject_code: input.subjectCode ?? null,
    points: input.points,
    ref_id: input.refId ?? null,
  })
  if (input.subjectCode) {
    await admin.rpc('bump_subject_reputation', {
      p_user_id: input.userId,
      p_subject_code: input.subjectCode,
      p_delta: input.points,
    })
  }
}

export async function getUserXpTotal(userId: string): Promise<number> {
  const admin = createServiceClient()
  const { data } = await admin.from('xp_events').select('points').eq('user_id', userId)
  return (data ?? []).reduce((sum, row) => sum + (row.points as number), 0)
}

export function badgesForReputation(reputation: number, subjectReps: { subjectCode: string; reputation: number }[]) {
  const badges: string[] = []
  if (reputation >= 50) badges.push('Top contributor')
  if (reputation >= 100) badges.push('Community veteran')
  for (const sr of subjectReps) {
    if (sr.reputation >= 25) badges.push(`Trusted in ${sr.subjectCode}`)
  }
  return badges
}
