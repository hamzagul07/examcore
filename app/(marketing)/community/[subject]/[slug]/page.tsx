import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { getPostByShortId, getUserPostVotes } from '@/lib/community/posts'
import { isOfficialUsername } from '@/lib/community/official'
import { AuthorBadge } from '@/components/community/AuthorBadge'
import {
  getCommentTree,
  collectCommentIds,
  getUserCommentVotes,
  countPeerReplies,
  peerReplyCountForPost,
} from '@/lib/community/comments'
import { signAttachments } from '@/lib/community/uploads'
import { findCommunitySubject } from '@/lib/community/subjects'
import { communityComposerFlags } from '@/lib/community/composer-flags'
import { timeAgo } from '@/lib/community/format'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { VoteBox } from '@/components/community/reddit/VoteBox'
import { CommentTree } from '@/components/community/reddit/CommentTree'
import { PostAttachments } from '@/components/community/reddit/PostAttachments'
import { SubjectSidebar } from '@/components/community/reddit/Sidebar'
import { communityPostHref, shortIdFromSlug } from '@/lib/community/post-url'
import { CommunityPostJsonLd } from '@/components/seo/CommunityPostJsonLd'
import { isIndexablePost } from '@/lib/community/indexable'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  discussion: 'Discussion',
  question: 'Question',
  resource: 'Resource',
}

type PageProps = { params: Promise<{ subject: string; slug: string }> }

async function loadPost(slug: string) {
  const shortId = shortIdFromSlug(slug)
  return shortId ? getPostByShortId(shortId) : null
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post) {
    return createPageMetadata({
      title: 'Post — Exam Room',
      description: 'Community post.',
      path: '/community',
      index: false,
    })
  }

  return createPageMetadata({
    title: `${post.title} — Exam Room`,
    description: post.bodyMd.slice(0, 150) || post.title,
    path: communityPostHref(post),
    // Publisher-authored threads and one-line posts stay out of the index:
    // thin, non-user-generated pages drag on the quality signals of the ones
    // that should rank, and Google's forum guidance excludes them anyway.
    index: isIndexablePost({
      ...post,
      peerReplyCount: await peerReplyCountForPost(post.id, post.authorId),
    }),
  })
}

export default async function PostDetailPage({ params }: PageProps) {
  if (!isCommunityEnabled()) redirect('/community')
  const { slug } = await params
  const post = await loadPost(slug)
  if (!post || post.status === 'removed') notFound()

  // A drifted slug or subject — a title edit, a hand-shortened link, a thread
  // moved between rooms — still serves the post, with the canonical tag in the
  // head pointing at the right URL. This is Reddit's own behaviour, and here it
  // is also the only correct option: community/loading.tsx puts a Suspense
  // boundary above these pages, so the shell is already flushed by the time the
  // post is loaded, and redirect() at that point can only emit a
  // <meta http-equiv="refresh"> — a soft redirect Google honours loosely and
  // which costs the reader a second round trip. The canonical consolidates the
  // duplicates properly and the content arrives immediately.

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
  // Replies from anyone but the author — what decides whether this thread is a
  // discussion or a person talking to themselves.
  const peerReplyCount = countPeerReplies(comments, post.authorId)

  const commentIds = collectCommentIds(comments)
  const commentVotes = user ? await getUserCommentVotes(user.id, commentIds) : {}

  // ON-02 keeps the digest opt-in, so the offer only appears for someone who
  // has not already said yes.
  const { offerDigest, needsUsername } = await communityComposerFlags(user?.id)

  return (
    <div className="rc-page rc-page--thread" style={{ '--sc': accent } as CSSProperties}>
      <CommunityPostJsonLd post={post} peerReplyCount={peerReplyCount} />
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
                    {isOfficialUsername(post.authorUsername) ? (
                      <span className="rc-official-badge" title="Official MarkScheme account">✓ Official</span>
                    ) : null}
                    <AuthorBadge access={post.authorAccess} />
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
              offerDigest={offerDigest}
              needsUsername={needsUsername}
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
