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
  const refId = input.refId ?? null

  // Idempotent per (user, kind, ref). Without this, a repeatable action —
  // accepting an answer over and over, re-triggering a marked-paper award — kept
  // inserting xp_events rows AND bumping subject reputation, an unbounded self-
  // serve farm. The migration's unique index on (user_id, kind, ref_id) is the
  // hard guard; this pre-check skips the redundant reputation bump on the common
  // re-award path. Ref-less awards (refId null) are not deduped.
  if (refId !== null) {
    const { data: existing } = await admin
      .from('xp_events')
      .select('id')
      .eq('user_id', input.userId)
      .eq('kind', input.kind)
      .eq('ref_id', refId)
      .maybeSingle()
    if (existing) return
  }

  const { error } = await admin.from('xp_events').insert({
    user_id: input.userId,
    kind: input.kind,
    subject_code: input.subjectCode ?? null,
    points: input.points,
    ref_id: refId,
  })
  // A unique-index violation here means a concurrent request already recorded
  // this event — it is already counted, so don't bump reputation a second time.
  if (error) return

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
