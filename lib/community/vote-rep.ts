import type { createServiceClient } from '@/lib/supabase-server'

type Admin = ReturnType<typeof createServiceClient>

/** Subject reputation an author gains per net upvote from another user. */
export const UPVOTE_REP = 2

/**
 * Adjust an author's subject-scoped reputation by `delta`. `bump_subject_reputation`
 * floors at 0. Used symmetrically: +UPVOTE_REP when a vote becomes an upvote,
 * -UPVOTE_REP when that upvote is toggled off or flipped to a downvote —
 * otherwise reputation only ever rises and a single voter can inflate an author
 * without bound by toggling a vote on and off.
 */
export async function adjustAuthorSubjectRep(
  admin: Admin,
  input: { authorId: string; subjectCode: string; delta: number }
) {
  if (!input.delta) return
  await admin.rpc('bump_subject_reputation', {
    p_user_id: input.authorId,
    p_subject_code: input.subjectCode,
    p_delta: input.delta,
  })
}

