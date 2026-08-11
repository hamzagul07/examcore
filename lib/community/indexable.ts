import { isOfficialUsername } from '@/lib/community/official'

/** Seeded student personas — `a1000001`…`a1000003`. */
const SEED_AUTHOR_PREFIX = 'a10000'

/** Below this, a post is a one-liner with nothing for a searcher to land on. */
const MIN_BODY_LENGTH = 120

export type IndexableCandidate = {
  authorId: string
  authorUsername: string | null
  bodyMd: string
  /** Replies from somebody other than the author. Self-replies do not count. */
  peerReplyCount: number
}

/**
 * Should this discussion post be indexed, and carry forum markup?
 *
 * Google's guidance for `DiscussionForumPosting` is explicit that it describes
 * *user-generated* content and must not be used for content authored by the
 * site or its agents. Our threshold threads and seeded personas are exactly
 * that, so they are neither marked up nor indexed — claiming a forum result for
 * something we wrote ourselves is the kind of thing that costs a manual action.
 *
 * The length floor is a separate judgement: "yo?" and "anyone?" are real user
 * posts, and indexing them would put a page with nothing on it in front of a
 * searcher. A thread that drew replies is exempt, because the discussion under
 * it is the content even when the opening line is short.
 *
 * Those replies have to come from somebody else. Counting raw comments let the
 * three emptiest posts on the site through — "yo?", "anyone?" and an empty body
 * — because their only replies were the author bumping their own thread. A
 * conversation with one participant is not a conversation.
 */
export function isIndexablePost(post: IndexableCandidate): boolean {
  if (post.authorId.startsWith(SEED_AUTHOR_PREFIX)) return false
  if (isOfficialUsername(post.authorUsername)) return false
  if (post.peerReplyCount > 0) return true
  return post.bodyMd.trim().length >= MIN_BODY_LENGTH
}
