import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { CommunityPost } from '@/lib/community/posts'
import { PostCard } from './PostCard'

export function PostFeed({
  posts,
  userVotes,
  signedIn,
  emptyLabel = 'No posts yet. Be the first to start a discussion.',
}: {
  posts: CommunityPost[]
  userVotes: Record<string, number>
  signedIn: boolean
  emptyLabel?: string
}) {
  if (!posts.length) {
    return (
      <div className="rc-empty">
        <div className="rc-empty-glyph" aria-hidden>
          💬
        </div>
        <p>{emptyLabel}</p>
        <div className="rc-empty-actions">
          <LoadingLink
            href="/community/submit"
            loadingText="Opening…"
            className="ec-btn-primary ec-btn-primary--sm min-h-[44px]"
          >
            Create a post
          </LoadingLink>
          {!signedIn ? (
            <Link href="/auth/signin?next=/community" className="ec-btn-ghost ec-btn-ghost--sm min-h-[44px]">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <div className="rc-feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} userVote={userVotes[p.id] ?? 0} signedIn={signedIn} />
      ))}
    </div>
  )
}
