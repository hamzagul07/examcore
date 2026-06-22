import Link from 'next/link'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { listPosts } from '@/lib/community/posts'
import { findCommunitySubject } from '@/lib/community/subjects'
import { compactCount } from '@/lib/community/format'

/**
 * Prominent community entry card for course/subject/attempt pages.
 * Shows the top few posts in a subject's "subreddit" + CTAs. Server component.
 */
export async function CommunityEntry({
  subjectCode,
  questionId,
  title = 'Exam Room community',
}: {
  subjectCode: string
  questionId?: string | null
  title?: string
}) {
  if (!isCommunityEnabled()) return null
  const subject = findCommunitySubject(subjectCode)
  const accent = subject?.accent ?? 'var(--ec-brand)'

  const posts = questionId
    ? await listPosts({ questionId, sort: 'hot', limit: 4 })
    : await listPosts({ subjectCode, sort: 'hot', limit: 4 })

  const submitParams = new URLSearchParams({ board: subject?.board ?? 'cambridge', subject: subjectCode })
  if (questionId) submitParams.set('kind', 'question')
  const submitHref = `/community/submit?${submitParams}`

  return (
    <section className="rc-entry" style={{ '--sc': accent } as CSSProperties}>
      <div className="rc-entry-head">
        <span className="rc-entry-glyph">{subject?.glyph ?? '💬'}</span>
        <div>
          <h3 className="rc-entry-title">{title}</h3>
          <p className="rc-entry-sub">
            {questionId
              ? 'Doubts and discussion about this question'
              : `Ask, share and discuss with other ${subject?.name ?? subjectCode} students`}
          </p>
        </div>
      </div>

      {posts.length ? (
        <div className="rc-entry-posts">
          {posts.map((p) => (
            <Link key={p.id} href={`/community/posts/${p.id}`} className="rc-entry-post" style={{ '--sc': accent } as CSSProperties}>
              <span className="rc-entry-post-score">{compactCount(p.score)}</span>
              <span className="rc-entry-post-title">{p.title}</span>
              <span className="rc-entry-post-comments">{p.commentCount} 💬</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rc-entry-sub">No posts yet — be the first to start the conversation.</p>
      )}

      <div className="rc-entry-actions">
        <Link href={submitHref} className="rc-btn rc-btn-primary">
          {questionId ? 'Ask about this question' : 'Create a post'}
        </Link>
        <Link href={`/community/s/${subjectCode}`} className="rc-btn rc-btn-ghost">
          Visit s/{subjectCode}
        </Link>
      </div>
    </section>
  )
}
