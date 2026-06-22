import type { createServiceClient } from '@/lib/supabase-server'

type Admin = ReturnType<typeof createServiceClient>

/** Bump subject-scoped reputation when content receives an upvote. */
export async function bumpAuthorRepOnUpvote(
  admin: Admin,
  input: {
    authorId: string
    subjectCode: string
    points?: number
  }
) {
  await admin.rpc('bump_subject_reputation', {
    p_user_id: input.authorId,
    p_subject_code: input.subjectCode,
    p_delta: input.points ?? 2,
  })
}
