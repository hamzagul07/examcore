/**
 * Official / platform accounts in the community.
 *
 * These are clearly-labeled team accounts (not students). The UI shows an
 * "Official" badge on their posts/comments so students can always tell the
 * platform's own voice apart from a real peer — transparency, not disguise.
 *
 * Keep this in sync with every account the seed scripts post under:
 *   - MarkScheme_Team    — scripts/seed-community-official-threads.mjs
 *   - markscheme_answers — scripts/seed-community/generate-model-answers.mjs,
 *                          generate-ib-essay-answers.mjs, and the results-week
 *                          threshold threads
 *
 * markscheme_answers was missing here, so the model answers and the June 2026
 * threshold threads rendered with no badge — a platform account reading as a
 * peer. Any account we post from belongs in this set.
 */
const OFFICIAL_USERNAMES = new Set<string>(['MarkScheme_Team', 'markscheme_answers'])

export function isOfficialUsername(username: string | null | undefined): boolean {
  return !!username && OFFICIAL_USERNAMES.has(username)
}
