/**
 * Official / platform accounts in the community.
 *
 * These are clearly-labeled team accounts (not students). The UI shows an
 * "Official" badge on their posts/comments so students can always tell the
 * platform's own voice apart from a real peer — transparency, not disguise.
 *
 * Keep this in sync with the account created by
 * scripts/seed-community-official-threads.mjs (TEAM_USERNAME).
 */
const OFFICIAL_USERNAMES = new Set<string>(['MarkScheme_Team'])

export function isOfficialUsername(username: string | null | undefined): boolean {
  return !!username && OFFICIAL_USERNAMES.has(username)
}
