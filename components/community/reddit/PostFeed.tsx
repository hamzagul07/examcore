import { PostCard } from './PostCard'
import type { CommunityPost } from '@/lib/community/posts'

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
        <div className="rc-empty-glyph" aria-hidden>💬</div>
        <p>{emptyLabel}</p>
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
