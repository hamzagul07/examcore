'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { buildSignInHref } from '@/lib/auth-redirect'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'

type Note = {
  id: string
  authorUsername: string | null
  title: string
  contentMd: string
  upvoteCount: number
  saveCount: number
  createdAt: string
}

export function NotesSection({
  board,
  subjectCode,
  subjectName,
  topicCode,
  lessonSlug,
  accent = 'var(--ec-brand)',
}: {
  board: 'cambridge' | 'ib'
  subjectCode: string
  subjectName: string
  topicCode?: string
  lessonSlug?: string
  accent?: string
}) {
  const { user, loading: authLoading } = useAuthCheck()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ board, subject: subjectCode })
    if (topicCode) qs.set('topic', topicCode)
    if (lessonSlug) qs.set('lesson', lessonSlug)
    try {
      const res = await fetch(`/api/community/notes?${qs}`)
      const data = await res.json()
      setNotes(Array.isArray(data.notes) ? data.notes : [])
    } catch {
      setNotes([])
    }
    setLoading(false)
  }, [board, subjectCode, topicCode, lessonSlug])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="community-notes" style={{ '--sc': accent } as CSSProperties} aria-labelledby="community-notes-h">
      <div className="community-head">
        <div>
          <h2 id="community-notes-h" className="ms-h3">
            Community notes
          </h2>
          <p className="ms-body-2 community-sub">
            Notes shared by other students for {subjectName}. Free to read — sign in to contribute or upvote.
          </p>
        </div>
        {!authLoading && user ? (
          <button type="button" className="ec-btn-primary community-contribute" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : '+ Contribute your notes'}
          </button>
        ) : !authLoading ? (
          <Link href={buildSignInHref('/subjects')} className="ec-btn-primary community-contribute">
            Sign in to contribute
          </Link>
        ) : null}
      </div>

      {open && user ? (
        <NoteEditor
          board={board}
          subjectCode={subjectCode}
          subjectName={subjectName}
          topicCode={topicCode}
          lessonSlug={lessonSlug}
          onPosted={() => {
            setOpen(false)
            load()
          }}
        />
      ) : null}

      {loading ? (
        <p className="ms-body-2 community-empty">Loading notes…</p>
      ) : notes.length ? (
        <ul className="community-note-list">
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} signedIn={!!user} />
          ))}
        </ul>
      ) : (
        <div className="community-empty-card">
          <p className="ms-body-2">
            No community notes yet for {subjectName}. {user ? 'Be the first to share your notes!' : 'Sign in to be the first to share.'}
          </p>
        </div>
      )}
    </section>
  )
}

function NoteRow({ note, signedIn }: { note: Note; signedIn: boolean }) {
  const [upvotes, setUpvotes] = useState(note.upvoteCount)
  const [voted, setVoted] = useState(false)
  const [busy, setBusy] = useState(false)

  async function vote() {
    if (!signedIn || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/community/notes/${note.id}/vote`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setVoted(data.voted)
        setUpvotes(data.upvoteCount)
      }
    } catch {
      /* ignore */
    }
    setBusy(false)
  }

  return (
    <li className="community-note-row">
      <button
        type="button"
        className={`community-vote${voted ? ' on' : ''}`}
        onClick={vote}
        disabled={!signedIn || busy}
        aria-label="Upvote"
        title={signedIn ? 'Upvote' : 'Sign in to upvote'}
      >
        <span className="community-vote-caret" aria-hidden>
          ▲
        </span>
        <span className="community-vote-n">{upvotes}</span>
      </button>
      <Link href={`/community/notes/${note.id}`} className="community-note-main">
        <span className="community-note-title">{note.title}</span>
        <span className="community-note-meta">
          {note.authorUsername ? `@${note.authorUsername}` : 'anonymous'}
          {note.saveCount > 0 ? ` · saved ${note.saveCount}×` : ''}
        </span>
      </Link>
    </li>
  )
}

function NoteEditor({
  board,
  subjectCode,
  subjectName,
  topicCode,
  lessonSlug,
  onPosted,
}: {
  board: 'cambridge' | 'ib'
  subjectCode: string
  subjectName: string
  topicCode?: string
  lessonSlug?: string
  onPosted: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
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
      const res = await fetch('/api/community/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, subjectCode, subjectName, topicCode, lessonSlug, title, contentMd: content }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'no_username') {
          setNeedUsername(true)
          setError('Choose a public username to post under.')
          setSubmitting(false)
          return
        }
        setError(data.error || 'Could not post your note.')
        setSubmitting(false)
        return
      }
      if (data.status === 'needs_edit') {
        setInfo(data.reason || 'Your note was held for review. Please revise and try again.')
        setSubmitting(false)
        return
      }
      onPosted()
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="community-editor">
      {needUsername ? (
        <label className="community-field">
          <span className="community-label">Pick a public username</span>
          <input
            className="community-input"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="e.g. studymaster_21"
            maxLength={20}
          />
        </label>
      ) : null}
      <label className="community-field">
        <span className="community-label">Title</span>
        <input
          className="community-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. SUVAT equations made easy"
          maxLength={140}
        />
      </label>
      <label className="community-field">
        <span className="community-label">
          Your notes <span className="community-hint">— Markdown + $math$ supported</span>
        </span>
        {preview ? (
          <div className="community-preview">
            <CommunityMarkdown content={content || '_Nothing to preview yet._'} />
          </div>
        ) : (
          <textarea
            className="community-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your notes, mnemonics, common mistakes…"
            rows={10}
          />
        )}
      </label>
      {error ? <p className="community-error">{error}</p> : null}
      {info ? <p className="community-info">{info}</p> : null}
      <div className="community-editor-actions">
        <button type="button" className="ec-btn-ghost text-sm" onClick={() => setPreview((p) => !p)}>
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button type="button" className="ec-btn-primary text-sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Posting…' : 'Post note'}
        </button>
      </div>
      <p className="community-guidelines">
        Posts are checked automatically and can be reported. Keep it on-topic, original, and respectful.
      </p>
    </div>
  )
}
