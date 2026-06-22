'use client'

import { useState } from 'react'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

export function NoteActions({
  id,
  initialUpvotes,
  initialSaves,
}: {
  id: string
  initialUpvotes: number
  initialSaves: number
}) {
  const { user } = useAuthCheck()
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [saves, setSaves] = useState(initialSaves)
  const [voted, setVoted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)

  async function toggle(kind: 'vote' | 'save') {
    if (!user || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/community/notes/${id}/${kind}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (kind === 'vote') {
          setVoted(data.voted)
          setUpvotes(data.upvoteCount)
        } else {
          setSaved(data.saved)
          setSaves(data.saveCount)
        }
      }
    } catch {
      /* ignore */
    }
    setBusy(false)
  }

  async function report() {
    if (!user || reported) return
    const reason = window.prompt('Why are you reporting this note? (optional)') ?? ''
    try {
      await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'note', targetId: id, reason }),
      })
      setReported(true)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="community-actions">
      <button type="button" className={`community-action${voted ? ' on' : ''}`} onClick={() => toggle('vote')} disabled={!user || busy}>
        ▲ {upvotes} {upvotes === 1 ? 'upvote' : 'upvotes'}
      </button>
      <button type="button" className={`community-action${saved ? ' on' : ''}`} onClick={() => toggle('save')} disabled={!user || busy}>
        {saved ? '★ Saved' : '☆ Save'} {saves > 0 ? `(${saves})` : ''}
      </button>
      <button type="button" className="community-action community-action-report" onClick={report} disabled={!user || reported}>
        {reported ? 'Reported' : '⚑ Report'}
      </button>
      {!user ? <span className="community-hint">Sign in to vote, save or report.</span> : null}
    </div>
  )
}
