'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CommentNode } from '@/lib/community/comments'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { timeAgo } from '@/lib/community/format'
import { VoteBox } from './VoteBox'

type Props = {
  postId: string
  subjectName: string
  comments: CommentNode[]
  userVotes: Record<string, number>
  signedIn: boolean
  locked?: boolean
}

export function CommentTree({ postId, subjectName, comments, userVotes, signedIn, locked }: Props) {
  return (
    <div className="rc-comments">
      <CommentComposer postId={postId} subjectName={subjectName} signedIn={signedIn} locked={locked} topLevel />
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
    <li className="rc-comment">
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
  onDone,
}: {
  postId: string
  parentId?: string
  subjectName: string
  signedIn: boolean
  topLevel?: boolean
  locked?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [needUsername, setNeedUsername] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (locked && topLevel) {
    return <p className="rc-comments-empty">🔒 This thread is locked.</p>
  }
  if (!signedIn && topLevel) {
    return (
      <div className="rc-comment-signin">
        <Link href={`/auth/signin?next=/community/posts/${postId}`} className="rc-btn rc-btn-primary">
          Sign in to comment
        </Link>
      </div>
    )
  }
  if (!signedIn) return null

  async function submit() {
    setError('')
    if (body.trim().length < 1) return
    setSubmitting(true)
    try {
      if (needUsername) {
        const ures = await fetch('/api/community/username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        const udata = await ures.json()
        if (!ures.ok) {
          setError(udata.error || 'Could not set username.')
          setSubmitting(false)
          return
        }
        setNeedUsername(false)
      }
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMd: body, parentId, subjectName }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'no_username') {
          setNeedUsername(true)
          setError('Choose a username to comment under.')
          setSubmitting(false)
          return
        }
        setError(data.error || 'Could not post your comment.')
        setSubmitting(false)
        return
      }
      setBody('')
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
      {needUsername ? (
        <input
          className="rc-input"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="Pick a public username"
          maxLength={20}
        />
      ) : null}
      {error ? <p className="rc-error">{error}</p> : null}
      <div className="rc-comment-composer-actions">
        {parentId ? (
          <button type="button" className="rc-btn rc-btn-ghost" onClick={() => onDone?.()}>Cancel</button>
        ) : null}
        <button type="button" className="rc-btn rc-btn-primary" onClick={submit} disabled={submitting || !body.trim()}>
          {submitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </div>
  )
}
