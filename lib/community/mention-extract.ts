/**
 * Pure @mention parsing, split out of mentions.ts (which is server-only) so
 * the cap can be unit-tested as a plain tsx script.
 */

/**
 * Distinct users one post or comment may notify.
 *
 * Every mention fans out to an in-app row and, subject to the per-sender
 * cooldown, an email. Without a ceiling a single comment naming fifty people
 * is fifty emails from one request (code review 2026-09-25, §2 Community —
 * mention spam). Five is more than a genuine reply ever needs.
 */
export const MAX_MENTIONS_PER_BODY = 5

/** Reddit-style @user and u/user mentions in markdown text. */
const MENTION_PATTERNS = [
  /(?:^|[\s(,])@([a-zA-Z0-9_]{3,20})\b/g,
  /(?:^|[\s(,])u\/([a-zA-Z0-9_]{3,20})\b/gi,
]

/**
 * Lower-cased distinct usernames in order of first appearance, capped at
 * MAX_MENTIONS_PER_BODY. The first mentions win: they are the ones the author
 * typed deliberately at the top of the reply; anything past the cap is noise.
 */
export function extractMentionUsernames(text: string, max = MAX_MENTIONS_PER_BODY): string[] {
  if (!text) return []
  const found = new Map<string, number>()
  for (const re of MENTION_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const name = m[1]?.toLowerCase()
      if (!name) continue
      const at = m.index + m[0].indexOf(m[1])
      const prev = found.get(name)
      if (prev === undefined || at < prev) found.set(name, at)
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, Math.max(0, max))
    .map(([name]) => name)
}
