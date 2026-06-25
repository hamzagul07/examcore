'use client'

import { useState } from 'react'
import Link from 'next/link'
import { compactCount } from '@/lib/community/format'

type Props = {
  targetType: 'post' | 'comment'
  id: string
  initialScore: number
  initialVote?: number
  signedIn: boolean
  layout?: 'vertical' | 'horizontal'
}

export function VoteBox({ targetType, id, initialScore, initialVote = 0, signedIn, layout = 'vertical' }: Props) {
  const [score, setScore] = useState(initialScore)
  const [vote, setVote] = useState(initialVote)
  const [busy, setBusy] = useState(false)
  const [signInHint, setSignInHint] = useState(false)

  async function cast(value: 1 | -1) {
    if (busy) return
    if (!signedIn) {
      setSignInHint(true)
      return
    }
    setSignInHint(false)
    const prevVote = vote
    const prevScore = score
    const nextVote = prevVote === value ? 0 : value
    setVote(nextVote)
    setScore(prevScore - prevVote + nextVote)
    setBusy(true)
    try {
      const res = await fetch(`/api/community/${targetType === 'post' ? 'posts' : 'comments'}/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      const data = await res.json()
      if (res.ok) {
        setVote(typeof data.value === 'number' ? data.value : nextVote)
        if (typeof data.score === 'number') setScore(data.score)
      } else {
        setVote(prevVote)
        setScore(prevScore)
      }
    } catch {
      setVote(prevVote)
      setScore(prevScore)
    }
    setBusy(false)
  }

  return (
    <div className={`rc-votebox rc-votebox-${layout}`}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={vote === 1}
        disabled={busy}
        className={`rc-vote-btn${vote === 1 ? ' rc-vote-up-on' : ''}`}
        onClick={() => cast(1)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d="M12 4l8 9h-5v7H9v-7H4z" fill="currentColor" />
        </svg>
      </button>
      <span
        className={`rc-vote-score${vote === 1 ? ' up' : vote === -1 ? ' down' : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {compactCount(score)}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={vote === -1}
        disabled={busy}
        className={`rc-vote-btn${vote === -1 ? ' rc-vote-down-on' : ''}`}
        onClick={() => cast(-1)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d="M12 20l-8-9h5V4h6v7h5z" fill="currentColor" />
        </svg>
      </button>
      {signInHint && !signedIn ? (
        <p className="rc-vote-signin-hint">
          <Link href="/auth/signin?next=/community">Sign in</Link> to vote
        </p>
      ) : null}
    </div>
  )
}
