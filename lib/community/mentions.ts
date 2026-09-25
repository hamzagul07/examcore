import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { extractMentionUsernames, MAX_MENTIONS_PER_BODY } from '@/lib/community/mention-extract'

// The parser (and its per-body cap) is pure and lives in mention-extract.ts so
// it can be tested without a Supabase client.
export { extractMentionUsernames, MAX_MENTIONS_PER_BODY }

/** Map lowercase username → user id (excludes author). */
export async function resolveMentionUserIds(
  usernames: string[],
  excludeUserId: string
): Promise<Map<string, string>> {
  if (!usernames.length) return new Map()
  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username')
    .in(
      'username',
      usernames.map((u) => u.toLowerCase())
    )

  const out = new Map<string, string>()
  for (const row of data ?? []) {
    const uname = (row.username as string)?.toLowerCase()
    const id = row.id as string
    if (uname && id !== excludeUserId) out.set(uname, id)
  }
  return out
}
