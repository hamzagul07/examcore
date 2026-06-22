'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { buildSignInHref } from '@/lib/auth-redirect'

type Question = {
  id: string
  authorUsername: string | null
  title: string
  voteCount: number
  answerCount: number
  acceptedAnswerId: string | null
}

export function QASection({
  board,
  subjectCode,
  subjectName,
  topicCode,
  lessonSlug,
  questionId,
  askOpen = false,
  accent = 'var(--ec-brand)',
}: {
  board: 'cambridge' | 'ib'
  subjectCode: string
  subjectName: string
  topicCode?: string
  lessonSlug?: string
  questionId?: string | null
  askOpen?: boolean
  accent?: string
}) {
  const { user, loading: authLoading } = useAuthCheck()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(askOpen)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ board, subject: subjectCode })
    if (topicCode) qs.set('topic', topicCode)
    if (lessonSlug) qs.set('lesson', lessonSlug)
    if (questionId) qs.set('questionId', questionId)
    try {
      const res = await fetch(`/api/community/questions?${qs}`)
      const data = await res.json()
      setQuestions(Array.isArray(data.questions) ? data.questions : [])
    } catch {
      setQuestions([])
    }
    setLoading(false)
  }, [board, subjectCode, topicCode, lessonSlug, questionId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="community-notes" style={{ '--sc': accent } as CSSProperties} aria-labelledby="community-qa-h">
      <div className="community-head">
        <div>
          <h2 id="community-qa-h" className="ms-h3">
            Questions &amp; answers
          </h2>
          <p className="ms-body-2 community-sub">
            Ask the {subjectName} community and help others. Public, searchable, and moderated.
          </p>
        </div>
        {!authLoading && user ? (
          <button type="button" className="ec-btn-primary community-contribute" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : '+ Ask a question'}
          </button>
        ) : !authLoading ? (
          <Link href={buildSignInHref('/subjects')} className="ec-btn-primary community-contribute">
            Sign in to ask
          </Link>
        ) : null}
      </div>

      {open && user ? (
        <AskForm
          board={board}
          subjectCode={subjectCode}
          subjectName={subjectName}
          topicCode={topicCode}
          lessonSlug={lessonSlug}
          questionId={questionId}
          onPosted={() => {
            setOpen(false)
            load()
          }}
        />
      ) : null}

      {loading ? (
        <p className="community-empty">Loading questions…</p>
      ) : questions.length ? (
        <ul className="community-note-list">
          {questions.map((q) => (
            <li key={q.id} className="community-note-row">
              <span className="community-vote" aria-hidden>
                <span className="community-vote-caret">▲</span>
                <span className="community-vote-n">{q.voteCount}</span>
              </span>
              <Link href={`/community/questions/${q.id}`} className="community-note-main">
                <span className="community-note-title">
                  {q.title} {q.acceptedAnswerId ? <span className="community-solved">solved ✓</span> : null}
                </span>
                <span className="community-note-meta">
                  {q.answerCount} {q.answerCount === 1 ? 'answer' : 'answers'}
                  {q.authorUsername ? ` · @${q.authorUsername}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="community-empty-card">
          <p className="ms-body-2">
            No questions yet for {subjectName}. {user ? 'Ask the first one!' : 'Sign in to ask the first question.'}
          </p>
        </div>
      )}
    </section>
  )
}

function AskForm({
  board,
  subjectCode,
  subjectName,
  topicCode,
  lessonSlug,
  questionId,
  onPosted,
}: {
  board: 'cambridge' | 'ib'
  subjectCode: string
  subjectName: string
  topicCode?: string
  lessonSlug?: string
  questionId?: string | null
  onPosted: () => void
}) {
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [needUsername, setNeedUsername] = useState(false)
  const [username, setUsername] = useState('')

  async function submit() {
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
        const udata = await ures.json()
        if (!ures.ok) {
          setError(udata.error || 'Could not set username.')
          setSubmitting(false)
          return
        }
        setNeedUsername(false)
      }
      const res = await fetch('/api/community/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, subjectCode, subjectName, topicCode, lessonSlug, questionId, title, bodyMd }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'no_username') {
          setNeedUsername(true)
          setError('Choose a public username to post under.')
          setSubmitting(false)
          return
        }
        setError(data.error || 'Could not post your question.')
        setSubmitting(false)
        return
      }
      if (data.status === 'needs_edit') {
        setInfo(data.reason || 'Held for review — please revise.')
        setSubmitting(false)
        return
      }
      onPosted()
    } catch {
      setError('Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="community-editor">
      {needUsername ? (
        <label className="community-field">
          <span className="community-label">Pick a public username</span>
          <input className="community-input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="e.g. studymaster_21" maxLength={20} />
        </label>
      ) : null}
      <label className="community-field">
        <span className="community-label">Question</span>
        <input className="community-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why is enthalpy of solution sometimes positive?" maxLength={160} />
      </label>
      <label className="community-field">
        <span className="community-label">
          Details <span className="community-hint">— optional, Markdown + $math$</span>
        </span>
        <textarea className="community-textarea" value={bodyMd} onChange={(e) => setBodyMd(e.target.value)} placeholder="Add context, what you've tried…" rows={5} />
      </label>
      {error ? <p className="community-error">{error}</p> : null}
      {info ? <p className="community-info">{info}</p> : null}
      <div className="community-editor-actions">
        <button type="button" className="ec-btn-primary text-sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Posting…' : 'Post question'}
        </button>
      </div>
    </div>
  )
}
