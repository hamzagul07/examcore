import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'

/** Reddit-style @user and u/user mentions in markdown text. */
const MENTION_PATTERNS = [
  /(?:^|[\s(,])@([a-zA-Z0-9_]{3,20})\b/g,
  /(?:^|[\s(,])u\/([a-zA-Z0-9_]{3,20})\b/gi,
]

export function extractMentionUsernames(text: string): string[] {
  const found = new Set<string>()
  for (const re of MENTION_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const name = m[1]?.toLowerCase()
      if (name) found.add(name)
    }
  }
  return [...found]
}

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
