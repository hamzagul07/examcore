'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import type { CommunityAttachment } from '@/lib/community/uploads'

type SubjectOpt = { id: string; name: string; board: 'cambridge' | 'ib'; accent: string; glyph: string }
type Kind = 'discussion' | 'question' | 'resource'

const KINDS: { id: Kind; label: string; hint: string; icon: string }[] = [
  { id: 'discussion', label: 'Discussion', hint: 'Share a thought or start a chat', icon: '💬' },
  { id: 'question', label: 'Question', hint: 'Ask a doubt', icon: '❓' },
  { id: 'resource', label: 'Resource', hint: 'Share notes, PDFs or files', icon: '📎' },
]

export function PostComposer({
  subjects,
  initialSubject,
  signedIn,
}: {
  subjects: SubjectOpt[]
  initialSubject?: string
  signedIn: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<Kind>('discussion')
  const [subjectId, setSubjectId] = useState(initialSubject ?? '')
  const [subjectQuery, setSubjectQuery] = useState('')
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [flair, setFlair] = useState('')
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [needUsername, setNeedUsername] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedSubject = subjects.find((s) => s.id === subjectId) ?? null
  const filtered = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    if (!q) return subjects.slice(0, 8)
    return subjects.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q)).slice(0, 8)
  }, [subjects, subjectQuery])

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    setError('')
    setUploading(true)
    for (const file of Array.from(files).slice(0, 10 - attachments.length)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/community/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok && data.attachment) {
          setAttachments((prev) => [...prev, data.attachment])
        } else {
          if (data.code === 'no_username') setNeedUsername(true)
          setError(data.error || 'Upload failed.')
        }
      } catch {
        setError('Upload failed.')
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    setError('')
    if (!signedIn) {
      router.push('/auth/signin?next=/community/submit')
      return
    }
    if (!selectedSubject) {
      setError('Pick a subject for your post.')
      return
    }
    if (title.trim().length < 5) {
      setError('Add a clearer title (at least 5 characters).')
      return
    }
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
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: selectedSubject.board,
          subjectCode: selectedSubject.id,
          subjectName: selectedSubject.name,
          kind,
          flair: flair.trim() || undefined,
          title: title.trim(),
          bodyMd,
          attachments,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'no_username') {
          setNeedUsername(true)
          setError('Choose a username to post under.')
          setSubmitting(false)
          return
        }
        setError(data.error || 'Could not publish your post.')
        setSubmitting(false)
        return
      }
      router.push(`/community/posts/${data.id}`)
      router.refresh()
    } catch {
      setError('Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="rc-composer" style={{ '--sc': selectedSubject?.accent ?? 'var(--ec-brand)' } as CSSProperties}>
      <h1 className="rc-composer-h1">Create a post</h1>

      <div className="rc-kind-tabs">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`rc-kind-tab${kind === k.id ? ' on' : ''}`}
            onClick={() => setKind(k.id)}
          >
            <span aria-hidden>{k.icon}</span>
            <span className="rc-kind-tab-label">{k.label}</span>
            <span className="rc-kind-tab-hint">{k.hint}</span>
          </button>
        ))}
      </div>

      <div className="rc-composer-card">
        <label className="rc-field">
          <span className="rc-label">Subject</span>
          {selectedSubject ? (
            <div className="rc-subject-selected">
              <span className="rc-subject-selected-glyph" style={{ '--sc': selectedSubject.accent } as CSSProperties}>
                {selectedSubject.glyph}
              </span>
              <span>s/{selectedSubject.id} · {selectedSubject.name}</span>
              <button type="button" className="rc-subject-change" onClick={() => setSubjectId('')}>Change</button>
            </div>
          ) : (
            <>
              <input
                className="rc-input"
                placeholder="Search subjects…"
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
              />
              <div className="rc-subject-options">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="rc-subject-option"
                    style={{ '--sc': s.accent } as CSSProperties}
                    onClick={() => { setSubjectId(s.id); setSubjectQuery('') }}
                  >
                    <span className="rc-subject-option-glyph">{s.glyph}</span>
                    <span>{s.name}</span>
                    <span className="rc-subject-option-code">s/{s.id}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </label>

        <label className="rc-field">
          <span className="rc-label">Title</span>
          <input
            className="rc-input"
            placeholder="An interesting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <span className="rc-counter">{title.length}/200</span>
        </label>

        <label className="rc-field">
          <span className="rc-label">Flair <span className="rc-optional">(optional)</span></span>
          <input
            className="rc-input"
            placeholder="e.g. Grade boundaries, P3, Help"
            value={flair}
            onChange={(e) => setFlair(e.target.value)}
            maxLength={30}
          />
        </label>

        <label className="rc-field">
          <span className="rc-label">
            {kind === 'question' ? 'What’s your doubt?' : kind === 'resource' ? 'Describe your resource' : 'Text'}
            {kind !== 'resource' ? '' : <span className="rc-optional"> (optional)</span>}
          </span>
          <textarea
            className="rc-textarea"
            placeholder="Markdown and $LaTeX$ supported…"
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            rows={8}
          />
        </label>

        <div className="rc-field">
          <span className="rc-label">Attachments <span className="rc-optional">(PDF, images, docs — max 4MB each)</span></span>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
            className="rc-file-input"
            onChange={(e) => onPickFiles(e.target.files)}
            disabled={uploading || attachments.length >= 10}
          />
          {uploading ? <p className="rc-hint">Uploading…</p> : null}
          {attachments.length ? (
            <ul className="rc-attach-list">
              {attachments.map((a, i) => (
                <li key={a.path} className="rc-attach-item">
                  <span className="rc-attach-kind">{a.kind === 'image' ? '🖼' : a.kind === 'pdf' ? '📄' : '📎'}</span>
                  <span className="rc-attach-name">{a.name}</span>
                  <button
                    type="button"
                    className="rc-attach-remove"
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {needUsername ? (
          <label className="rc-field">
            <span className="rc-label">Pick a public username</span>
            <input
              className="rc-input"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. studymaster_21"
              maxLength={20}
            />
          </label>
        ) : null}

        {error ? <p className="rc-error">{error}</p> : null}

        <div className="rc-composer-actions">
          <button type="button" className="rc-btn rc-btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="button" className="rc-btn rc-btn-primary" onClick={submit} disabled={submitting || uploading}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
