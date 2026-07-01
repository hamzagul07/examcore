import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { getPost, getUserPostVotes } from '@/lib/community/posts'
import { getCommentTree, collectCommentIds, getUserCommentVotes } from '@/lib/community/comments'
import { signAttachments } from '@/lib/community/uploads'
import { findCommunitySubject } from '@/lib/community/subjects'
import { timeAgo } from '@/lib/community/format'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { VoteBox } from '@/components/community/reddit/VoteBox'
import { CommentTree } from '@/components/community/reddit/CommentTree'
import { PostAttachments } from '@/components/community/reddit/PostAttachments'
import { SubjectSidebar } from '@/components/community/reddit/Sidebar'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  discussion: 'Discussion',
  question: 'Question',
  resource: 'Resource',
}

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const post = await getPost(id)
  return createPageMetadata({
    title: post ? `${post.title} — Exam Room` : 'Post — Exam Room',
    description: post ? post.bodyMd.slice(0, 150) : 'Community post.',
    path: `/community/posts/${id}`,
  })
}

export default async function PostDetailPage({ params }: PageProps) {
  if (!isCommunityEnabled()) redirect('/community')
  const { id } = await params
  const post = await getPost(id)
  if (!post || post.status === 'removed') notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (post.status !== 'published' && post.authorId !== user?.id) notFound()

  const subject = findCommunitySubject(post.subjectCode)
  const accent = subject?.accent ?? 'var(--ec-brand)'

  const [signedAttachments, comments, postVotes] = await Promise.all([
    signAttachments(post.attachments),
    getCommentTree(post.id),
    user ? getUserPostVotes(user.id, [post.id]) : Promise.resolve({} as Record<string, number>),
  ])
  const commentIds = collectCommentIds(comments)
  const commentVotes = user ? await getUserCommentVotes(user.id, commentIds) : {}

  return (
    <div className="rc-page rc-page--thread" style={{ '--sc': accent } as CSSProperties}>
      <div className="rc-layout">
        <main className="rc-main">
          <Link href={`/community/s/${post.subjectCode}`} className="rc-back">← s/{post.subjectCode}</Link>

          <article className="rc-post" style={{ '--sc': accent } as CSSProperties}>
            <div className="rc-post-head">
              <div className="rc-post-vote">
                <VoteBox
                  targetType="post"
                  id={post.id}
                  initialScore={post.score}
                  initialVote={postVotes[post.id] ?? 0}
                  signedIn={!!user}
                />
              </div>
              <div className="rc-post-headmain">
                <div className="rc-card-meta">
                  <Link href={`/community/s/${post.subjectCode}`} className="rc-subject-pill" style={{ '--sc': accent } as CSSProperties}>
                    <span className="rc-subject-glyph">{subject?.glyph ?? '#'}</span>
                    <span>s/{post.subjectCode}</span>
                  </Link>
                  <span className="rc-dot">·</span>
                  <span className="rc-meta-muted">
                    Posted by{' '}
                    {post.authorUsername ? (
                      <Link href={`/u/${post.authorUsername}`} className="rc-author">u/{post.authorUsername}</Link>
                    ) : (
                      'anonymous'
                    )}
                  </span>
                  <span className="rc-dot">·</span>
                  <span className="rc-meta-muted">{timeAgo(post.createdAt)}</span>
                </div>
                <h1 className="rc-post-title">
                  <span className="rc-post-title-chips">
                    <span className={`rc-kind rc-kind-${post.kind}`}>{KIND_LABEL[post.kind]}</span>
                    {post.flair ? <span className="rc-flair">{post.flair}</span> : null}
                  </span>
                  <span className="rc-post-title-text">{post.title}</span>
                </h1>
                {post.status === 'needs_edit' ? (
                  <p className="rc-status-note">⏳ Held for review — only you can see this until approved.</p>
                ) : null}
                {post.bodyMd ? (
                  <div className="rc-post-body">
                    <CommunityMarkdown content={post.bodyMd} />
                  </div>
                ) : null}
                <PostAttachments attachments={signedAttachments} />
              </div>
            </div>

            <div className="rc-post-divider" />

            <CommentTree
              postId={post.id}
              subjectName={subject?.name ?? post.subjectCode}
              comments={comments}
              userVotes={commentVotes}
              signedIn={!!user}
              locked={post.isLocked}
            />
          </article>
        </main>
        <SubjectSidebar
          subjectCode={post.subjectCode}
          subjectName={subject?.name ?? post.subjectCode}
          accent={accent}
        />
      </div>
    </div>
  )
}
