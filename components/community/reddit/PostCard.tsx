import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { CommunityPost } from '@/lib/community/posts'
import { findCommunitySubject } from '@/lib/community/subjects'
import { communityBoardMeta } from '@/lib/community/boards'
import { timeAgo } from '@/lib/community/format'
import { VoteBox } from './VoteBox'

const KIND_LABEL: Record<string, string> = {
  discussion: 'Discussion',
  question: 'Question',
  resource: 'Resource',
}

function snippet(md: string, n = 220): string {
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~$]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > n ? `${text.slice(0, n)}…` : text
}

export function PostCard({
  post,
  userVote = 0,
  signedIn,
}: {
  post: CommunityPost
  userVote?: number
  signedIn: boolean
}) {
  const subject = findCommunitySubject(post.subjectCode)
  const accent = subject?.accent ?? 'var(--ec-brand)'
  const boardMeta = communityBoardMeta(post.board)
  const href = `/community/posts/${post.id}`
  const body = snippet(post.bodyMd)
  const imageCount = post.attachments.filter((a) => a.kind === 'image').length
  const fileCount = post.attachments.length - imageCount

  return (
    <article className="rc-card" style={{ '--sc': accent } as CSSProperties}>
      <div className="rc-card-vote">
        <VoteBox targetType="post" id={post.id} initialScore={post.score} initialVote={userVote} signedIn={signedIn} />
      </div>
      <div className="rc-card-body">
        <div className="rc-card-meta">
          <span className={`rc-board-badge rc-board-badge--${post.board}`}>{boardMeta.short}</span>
          <span className="rc-dot">·</span>
          <Link href={`/community/s/${post.subjectCode}`} className="rc-subject-pill" style={{ '--sc': accent } as CSSProperties}>
            <span className="rc-subject-glyph">{subject?.glyph ?? '#'}</span>
            <span>s/{post.subjectCode}</span>
          </Link>
          <span className="rc-dot">·</span>
          <span className="rc-meta-muted">
            {post.authorUsername ? (
              <Link href={`/u/${post.authorUsername}`} className="rc-author">u/{post.authorUsername}</Link>
            ) : (
              'anonymous'
            )}
          </span>
          <span className="rc-dot">·</span>
          <span className="rc-meta-muted">{timeAgo(post.createdAt)}</span>
        </div>

        <Link href={href} className="rc-card-title-link">
          <h3 className="rc-card-title">
            <span className={`rc-kind rc-kind-${post.kind}`}>{KIND_LABEL[post.kind]}</span>
            {post.flair ? <span className="rc-flair">{post.flair}</span> : null}
            {post.title}
          </h3>
        </Link>

        {body ? (
          <Link href={href} className="rc-card-snippet-link">
            <p className="rc-card-snippet">{body}</p>
          </Link>
        ) : null}

        {post.attachments.length ? (
          <div className="rc-attach-row">
            {imageCount > 0 ? <span className="rc-attach-chip">🖼 {imageCount} image{imageCount > 1 ? 's' : ''}</span> : null}
            {fileCount > 0 ? <span className="rc-attach-chip">📎 {fileCount} file{fileCount > 1 ? 's' : ''}</span> : null}
          </div>
        ) : null}

        <div className="rc-card-actions">
          <Link href={href} className="rc-action">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M4 4h16v12H7l-3 3z"/></svg>
            {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
          </Link>
          <span className="rc-action rc-action-static">▲ {post.upvotes} · ▼ {post.downvotes}</span>
        </div>
      </div>
    </article>
  )
}
