import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site-config'
import type { CommunityPost } from '@/lib/community/posts'
import { communityPostHref } from '@/lib/community/post-url'
import { isIndexablePost } from '@/lib/community/indexable'

/** Strip Markdown to plain text for schema.org text fields. */
function toText(md: string, max = 1500): string {
  return (md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*`_>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/**
 * DiscussionForumPosting for a community thread — what makes a page eligible
 * for Google's "Discussions and forums" and Perspectives results.
 *
 * Emitted only for posts that pass `isIndexablePost`. Google's guidance is that
 * this markup describes user-generated content and must not be applied to
 * anything the site or its agents wrote, so our threshold threads and seeded
 * personas get nothing — claiming a forum result for our own copy is how a site
 * earns a manual action rather than a rich result.
 *
 * Question threads use QAPage instead, via CommunityQaJsonLd. Google treats Q&A
 * as a special case of a forum page and prefers the more specific type.
 */
export function CommunityPostJsonLd({
  post,
  peerReplyCount,
}: {
  post: CommunityPost
  peerReplyCount: number
}) {
  if (!isIndexablePost({ ...post, peerReplyCount })) return null

  const url = `${SITE_URL}${communityPostHref(post)}`
  const author = post.authorUsername
    ? { '@type': 'Person', name: post.authorUsername, url: `${SITE_URL}/u/${post.authorUsername}` }
    : { '@type': 'Person', name: 'A student' }

  return (
    <JsonLd
      data={{
        '@type': 'DiscussionForumPosting',
        '@id': url,
        url,
        headline: post.title,
        text: toText(post.bodyMd) || post.title,
        datePublished: post.createdAt,
        author,
        // Reactions and replies are the signals that separate a live thread
        // from an empty one, and the only counts we can state honestly.
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: Math.max(post.score, 0),
          },
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: Math.max(peerReplyCount, 0),
          },
        ],
      }}
    />
  )
}
