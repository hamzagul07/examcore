import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'

export type ComposerFlags = {
  /** Signed in and not yet subscribed — we may offer the digest after they post. */
  offerDigest: boolean
  /** Signed in with no public name yet — offer the choice before we generate one. */
  needsUsername: boolean
}

const NONE: ComposerFlags = { offerDigest: false, needsUsername: false }

/**
 * What a composer should offer this user, resolved in one read.
 *
 * Shared so the post page and the Q&A page cannot drift: an offer that appears
 * in one place and not the other reads as a bug to the person seeing it, and
 * re-asking someone who already subscribed is worse than never asking.
 */
export async function communityComposerFlags(
  userId: string | null | undefined
): Promise<ComposerFlags> {
  if (!userId) return NONE

  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('email_community_digest, username')
    .eq('id', userId)
    .maybeSingle()

  return {
    offerDigest: !data?.email_community_digest,
    needsUsername: !data?.username,
  }
}
