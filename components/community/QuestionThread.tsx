'use client'

import { useState } from 'react'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'

type Answer = {
  id: string
  authorUsername: string | null
  bodyMd: string
  voteCount: number
  isAccepted: boolean
}
type Question = {
  id: string
  authorId: string
  authorUsername: string | null
  title: string
  bodyMd: string
  voteCount: number
  subjectName: string
}

function VoteButton({ kind, id, count }: { kind: 'questions' | 'answers'; id: string; count: number }) {
  const { user } = useAuthCheck()
  const [n, setN] = useState(count)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  async function go() {
    if (!user || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/community/${kind}/${id}/vote`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setOn(data.voted)
        setN(data.voteCount)
      }
    } catch {
      /* ignore */
    }
    setBusy(false)
  }
  return (
    <button type="button" className={`community-vote${on ? ' on' : ''}`} onClick={go} disabled={!user || busy} aria-label="Upvote">
      <span className="community-vote-caret">▲</span>
      <span className="community-vote-n">{n}</span>
    </button>
  )
}

export function QuestionThread({ question, answers: initial }: { question: Question; answers: Answer[] }) {
  const { user } = useAuthCheck()
  const [answers, setAnswers] = useState(initial)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [needUsername, setNeedUsername] = useState(false)
  const [username, setUsername] = useState('')
  const isOwner = !!user && user.id === question.authorId

  async function postAnswer() {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (needUsername) {
        const ures = await fetch('/api/community/username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        if (!ures.ok) {
          setError((await ures.json()).error || 'Could not set username.')
          setSubmitting(false)
          return
        }
        setNeedUsername(false)
      }
      const res = await fetch(`/api/community/questions/${question.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMd: body, subjectName: question.subjectName }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'no_username') {
          setNeedUsername(true)
          setError('Choose a public username to post under.')
        } else setError(data.error || 'Could not post.')
        setSubmitting(false)
        return
      }
      if (data.status === 'needs_edit') {
        setInfo(data.reason || 'Held for review — please revise.')
        setSubmitting(false)
        return
      }
      window.location.reload()
    } catch {
      setError('Something went wrong.')
      setSubmitting(false)
    }
  }

  async function accept(answerId: string) {
    const res = await fetch(`/api/community/questions/${question.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId }),
    })
    if (res.ok) {
      setAnswers((prev) => prev.map((a) => ({ ...a, isAccepted: a.id === answerId })))
    }
  }

  return (
    <div className="community-thread">
      <div className="community-q">
        <VoteButton kind="questions" id={question.id} count={question.voteCount} />
        <div className="community-q-main">
          <h1 className="ms-h2 community-q-title">{question.title}</h1>
          {question.bodyMd ? (
            <div className="community-note-body">
              <CommunityMarkdown content={question.bodyMd} />
            </div>
          ) : null}
          <p className="community-note-meta">
            asked by {question.authorUsername ? `@${question.authorUsername}` : 'a student'}
          </p>
        </div>
      </div>

      <h2 className="ms-h3" style={{ marginTop: 28 }}>
        {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
      </h2>
      <ul className="community-answer-list">
        {answers.map((a) => (
          <li key={a.id} className={`community-answer${a.isAccepted ? ' accepted' : ''}`}>
            <VoteButton kind="answers" id={a.id} count={a.voteCount} />
            <div className="community-answer-main">
              {a.isAccepted ? <span className="community-solved">accepted ✓</span> : null}
              <div className="community-note-body">
                <CommunityMarkdown content={a.bodyMd} />
              </div>
              <div className="community-answer-foot">
                <span className="community-note-meta">{a.authorUsername ? `@${a.authorUsername}` : 'a student'}</span>
                {isOwner && !a.isAccepted ? (
                  <button type="button" className="ec-btn-underline text-sm" onClick={() => accept(a.id)}>
                    Accept this answer
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="ms-h3" style={{ marginTop: 28 }}>
        Your answer
      </h3>
      {user ? (
        <div className="community-editor">
          {needUsername ? (
            <label className="community-field">
              <span className="community-label">Pick a public username</span>
              <input className="community-input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={20} />
            </label>
          ) : null}
          <textarea
            className="community-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a helpful answer… Markdown + $math$ supported."
            rows={6}
          />
          {error ? <p className="community-error">{error}</p> : null}
          {info ? <p className="community-info">{info}</p> : null}
          <div className="community-editor-actions">
            <button type="button" className="ec-btn-primary text-sm" onClick={postAnswer} disabled={submitting}>
              {submitting ? 'Posting…' : 'Post answer'}
            </button>
          </div>
        </div>
      ) : (
        <p className="ms-body-2">Sign in to answer this question.</p>
      )}
    </div>
  )
}
