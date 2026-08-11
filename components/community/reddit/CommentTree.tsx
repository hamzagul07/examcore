'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CommentNode } from '@/lib/community/comments'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { timeAgo } from '@/lib/community/format'
import { isOfficialUsername } from '@/lib/community/official'
import { AuthorBadge } from '@/components/community/AuthorBadge'
import { DigestOptIn } from '@/components/community/DigestOptIn'
import { VoteBox } from './VoteBox'

type Props = {
  postId: string
  subjectName: string
  comments: CommentNode[]
  userVotes: Record<string, number>
  signedIn: boolean
  locked?: boolean
  /** Signed in and not yet subscribed — we may offer the digest after they post. */
  offerDigest?: boolean
  /** Signed in with no public name yet — offer them the choice before we generate one. */
  needsUsername?: boolean
}

const DRAFT_PREFIX = 'ms:community:draft:'

/** Hold a comment across the sign-in round trip. Best-effort: a full or
 *  disabled localStorage must never block posting. */
function saveDraft(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* nothing to do — they keep the text on screen if they come back */
  }
}

/** Read a draft and clear it, so it restores once rather than resurrecting
 *  after the comment is posted. */
function takeDraft(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    if (value) window.localStorage.removeItem(key)
    return value
  } catch {
    return null
  }
}

export function CommentTree({
  postId,
  subjectName,
  comments,
  userVotes,
  signedIn,
  locked,
  offerDigest,
  needsUsername,
}: Props) {
  return (
    <div className="rc-comments">
      <CommentComposer
        postId={postId}
        subjectName={subjectName}
        signedIn={signedIn}
        locked={locked}
        offerDigest={offerDigest}
        needsUsername={needsUsername}
        topLevel
      />
      <div className="rc-comments-count">
        {countComments(comments)} comment{countComments(comments) === 1 ? '' : 's'}
      </div>
      {comments.length ? (
        <ul className="rc-comment-list">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              node={c}
              postId={postId}
              subjectName={subjectName}
              userVotes={userVotes}
              signedIn={signedIn}
              locked={locked}
            />
          ))}
        </ul>
      ) : (
        <p className="rc-comments-empty">No comments yet. Start the conversation.</p>
      )}
    </div>
  )
}

function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countComments(n.replies), 0)
}

function CommentItem({
  node,
  postId,
  subjectName,
  userVotes,
  signedIn,
  locked,
}: {
  node: CommentNode
  postId: string
  subjectName: string
  userVotes: Record<string, number>
  signedIn: boolean
  locked?: boolean
}) {
  const [replying, setReplying] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <li className="rc-comment" id={`comment-${node.id}`}>
      <div className="rc-comment-row">
        <button
          type="button"
          className="rc-comment-collapse"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? '+' : '–'}
        </button>
        <div className="rc-comment-main">
          <div className="rc-comment-meta">
            {node.authorUsername ? (
              <Link href={`/u/${node.authorUsername}`} className="rc-author">u/{node.authorUsername}</Link>
            ) : (
              <span className="rc-meta-muted">anonymous</span>
            )}
            {isOfficialUsername(node.authorUsername) ? (
              <span className="rc-official-badge" title="Official MarkScheme account">✓ Official</span>
            ) : null}
            <AuthorBadge access={node.authorAccess} />
            <span className="rc-dot">·</span>
            <span className="rc-meta-muted">{timeAgo(node.createdAt)}</span>
          </div>
          {!collapsed ? (
            <>
              <div className="rc-comment-body">
                <CommunityMarkdown content={node.bodyMd} />
              </div>
              <div className="rc-comment-actions">
                <VoteBox
                  targetType="comment"
                  id={node.id}
                  initialScore={node.score}
                  initialVote={userVotes[node.id] ?? 0}
                  signedIn={signedIn}
                  layout="horizontal"
                />
                {!locked ? (
                  <button type="button" className="rc-comment-reply-btn" onClick={() => setReplying((r) => !r)}>
                    Reply
                  </button>
                ) : null}
              </div>
              {replying ? (
                <CommentComposer
                  postId={postId}
                  parentId={node.id}
                  subjectName={subjectName}
                  signedIn={signedIn}
                  onDone={() => setReplying(false)}
                />
              ) : null}
              {node.replies.length ? (
                <ul className="rc-comment-replies">
                  {node.replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      node={r}
                      postId={postId}
                      subjectName={subjectName}
                      userVotes={userVotes}
                      signedIn={signedIn}
                      locked={locked}
                    />
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function CommentComposer({
  postId,
  parentId,
  subjectName,
  signedIn,
  topLevel,
  locked,
  offerDigest,
  needsUsername,
  onDone,
}: {
  postId: string
  parentId?: string
  subjectName: string
  signedIn: boolean
  topLevel?: boolean
  locked?: boolean
  offerDigest?: boolean
  needsUsername?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const draftKey = `${DRAFT_PREFIX}${postId}:${parentId ?? 'top'}`
  const [body, setBody] = useState('')
  const [assignedUsername, setAssignedUsername] = useState('')
  const [showDigestOptIn, setShowDigestOptIn] = useState(false)
  // Once they have answered the digest ask — either way — it stays answered for
  // this visit. `offerDigest` is resolved when the page renders, so without
  // this a second comment re-asks somebody who just said no.
  const [digestSettled, setDigestSettled] = useState(false)
  const [chosenUsername, setChosenUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Restore whatever they had typed before we sent them to sign in. Runs on
  // mount rather than in useState so the server and first client render agree.
  useEffect(() => {
    const draft = takeDraft(draftKey)
    if (draft) setBody(draft)
  }, [draftKey])

  if (locked && topLevel) {
    return <p className="rc-comments-empty">This thread is locked.</p>
  }

  async function submit() {
    setError('')
    if (body.trim().length < 1) return

    // Signed-out readers get the box, not a wall. Typing is the commitment —
    // asking for an account before they have written anything loses people who
    // would have posted, and a "Sign in to comment" button gives them nothing
    // to react to. The draft is held so signing in does not cost them the
    // answer they just wrote.
    if (!signedIn) {
      saveDraft(draftKey, body)
      router.push(`/auth/signin?next=${encodeURIComponent(`/community/posts/${postId}`)}`)
      return
    }

    setSubmitting(true)
    try {
      // They typed a name, so claim it first. Left blank, the server generates
      // one — the field is an offer, not another gate.
      if (needsUsername && chosenUsername.trim()) {
        const ures = await fetch('/api/community/username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: chosenUsername.trim() }),
        })
        const udata = await ures.json()
        if (!ures.ok) {
          setError(udata.error || 'Could not save that name.')
          setSubmitting(false)
          return
        }
      }
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMd: body, parentId, subjectName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not post your comment.')
        setSubmitting(false)
        return
      }
      setBody('')
      // First contribution: the server just gave them a public handle. Say so
      // rather than letting them discover their own name on the post.
      if (data.assignedUsername) setAssignedUsername(data.assignedUsername)
      // Asked only after the comment lands, so the offer follows a
      // contribution instead of standing between them and posting one.
      if (offerDigest && !digestSettled) setShowDigestOptIn(true)
      onDone?.()
      router.refresh()
    } catch {
      setError('Something went wrong.')
    }
    setSubmitting(false)
  }

  return (
    <div className={`rc-comment-composer${topLevel ? ' rc-comment-composer-top' : ''}`}>
      <textarea
        className="rc-textarea"
        placeholder={parentId ? 'Write a reply…' : 'What are your thoughts?'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 3 : 4}
      />
      {showDigestOptIn ? (
        <DigestOptIn
          onDone={() => {
            setShowDigestOptIn(false)
            setDigestSettled(true)
          }}
        />
      ) : null}
      {assignedUsername ? (
        <p className="rc-comment-composer-note ms-body-2">
          Posted as <strong>u/{assignedUsername}</strong> — rename it any time in{' '}
          <Link href="/account/profile" className="ec-link">your account</Link>.
        </p>
      ) : null}
      {needsUsername && !assignedUsername ? (
        <label className="rc-username-pick">
          <span className="rc-username-pick__label">
            Public name <span className="rc-username-pick__hint">— optional, we pick one if you skip it</span>
          </span>
          <input
            className="rc-input"
            value={chosenUsername}
            onChange={(e) => setChosenUsername(e.target.value.toLowerCase())}
            placeholder="e.g. maths_mo"
            maxLength={20}
            autoComplete="off"
          />
        </label>
      ) : null}
      {error ? <p className="rc-error">{error}</p> : null}
      <div className="rc-comment-composer-actions">
        {parentId ? (
          <button type="button" className="rc-btn rc-btn-ghost" onClick={() => onDone?.()}>Cancel</button>
        ) : null}
        <button type="button" className="rc-btn rc-btn-primary" onClick={submit} disabled={submitting || !body.trim()}>
          {submitting
            ? 'Posting…'
            : !signedIn
              ? 'Sign in to post'
              : parentId
                ? 'Reply'
                : 'Comment'}
        </button>
      </div>
      {!signedIn ? (
        <p className="rc-comment-composer-note ms-body-2">
          You will need an account to post — we keep what you have written.
        </p>
      ) : null}
    </div>
  )
}
