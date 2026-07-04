import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { CommunityPost } from '@/lib/community/posts'
import { PostCard } from './PostCard'

/** Honest starter prompts — suggestions that open the real composer prefilled.
 * These are not posts; they give a signed-in student a low-friction way to
 * start the first genuine thread in a quiet room. */
type StarterPrompt = {
  emoji: string
  label: string
  kind: 'discussion' | 'question' | 'resource'
  title: string
}

const STARTER_PROMPTS: StarterPrompt[] = [
  { emoji: '❓', label: 'Ask a doubt', kind: 'question', title: "I'm stuck on… " },
  { emoji: '📚', label: 'Share a tip or resource', kind: 'resource', title: 'Something that helped me: ' },
  { emoji: '✍️', label: 'Get an answer checked', kind: 'discussion', title: 'Does my answer look right? ' },
  { emoji: '💬', label: 'Start a discussion', kind: 'discussion', title: 'What are you revising this week?' },
]

function submitHref(p: StarterPrompt, subject?: string, board?: string) {
  const params = new URLSearchParams({ kind: p.kind, title: p.title })
  if (subject) params.set('subject', subject)
  if (board) params.set('board', board)
  return `/community/submit?${params.toString()}`
}

export function PostFeed({
  posts,
  userVotes,
  signedIn,
  emptyLabel = 'No posts here yet — start the first thread.',
  promptSubject,
  promptBoard,
}: {
  posts: CommunityPost[]
  userVotes: Record<string, number>
  signedIn: boolean
  emptyLabel?: string
  /** Optional room context so starter prompts pre-select the subject/board. */
  promptSubject?: string
  promptBoard?: string
}) {
  if (!posts.length) {
    return (
      <div className="rc-empty">
        <div className="rc-empty-glyph" aria-hidden>
          💬
        </div>
        <p>{emptyLabel}</p>
        <p className="rc-empty-sub">
          The Exam Room is where IB &amp; Cambridge students help each other — ask a doubt, share what
          worked, or post an answer for a second opinion. Pick a prompt to get started:
        </p>
        <div className="rc-starter-grid">
          {STARTER_PROMPTS.map((p) => (
            <LoadingLink
              key={p.label}
              href={submitHref(p, promptSubject, promptBoard)}
              loadingText="Opening…"
              className="rc-starter-card"
            >
              <span className="rc-starter-emoji" aria-hidden>
                {p.emoji}
              </span>
              <span className="rc-starter-label">{p.label}</span>
            </LoadingLink>
          ))}
        </div>
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
