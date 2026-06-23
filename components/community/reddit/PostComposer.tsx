'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import type { Board } from '@/lib/community/posts'
import { COMMUNITY_BOARDS } from '@/lib/community/boards'
import type { CommunityAttachment } from '@/lib/community/uploads'
import { ExamLoader } from '@/components/ui/ExamLoader'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'

type SubjectOpt = { id: string; name: string; board: Board; accent: string; glyph: string }
type Kind = 'discussion' | 'question' | 'resource'

const KINDS: { id: Kind; label: string; hint: string; icon: string }[] = [
  { id: 'discussion', label: 'Discussion', hint: 'Share a thought or start a chat', icon: '💬' },
  { id: 'question', label: 'Question', hint: 'Ask a doubt', icon: '❓' },
  { id: 'resource', label: 'Resource', hint: 'Share notes, PDFs or files', icon: '📎' },
]

function boardFromSubject(subjects: SubjectOpt[], subjectId?: string): Board | '' {
  if (!subjectId) return ''
  return subjects.find((s) => s.id === subjectId)?.board ?? ''
}

export function PostComposer({
  subjects,
  popularByBoard,
  initialSubject,
  initialBoard,
  initialKind,
  signedIn,
}: {
  subjects: SubjectOpt[]
  /** Top subject room ids per board (by post activity). */
  popularByBoard?: Partial<Record<Board, string[]>>
  initialSubject?: string
  initialBoard?: Board
  initialKind?: Kind
  signedIn: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<Kind>(initialKind ?? 'discussion')
  const [board, setBoard] = useState<Board | ''>(() => {
    if (initialBoard === 'cambridge' || initialBoard === 'ib') return initialBoard
    return boardFromSubject(subjects, initialSubject)
  })
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

  const selectedBoard = COMMUNITY_BOARDS.find((b) => b.id === board) ?? null
  const boardSubjects = useMemo(
    () => (board ? subjects.filter((s) => s.board === board) : []),
    [subjects, board]
  )
  const selectedSubject = boardSubjects.find((s) => s.id === subjectId) ?? null
  const subjectOptions = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase()
    if (!q) return boardSubjects
    return boardSubjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    )
  }, [boardSubjects, subjectQuery])

  const chipSubjects = useMemo(() => {
    const q = subjectQuery.trim()
    if (q) return subjectOptions.slice(0, 12)
    const popularIds = board && popularByBoard?.[board] ? popularByBoard[board]! : []
    const popular = popularIds
      .map((id) => boardSubjects.find((s) => s.id === id))
      .filter((s): s is SubjectOpt => s != null)
    if (popular.length >= 4) return popular
    return boardSubjects.slice(0, 8)
  }, [subjectQuery, subjectOptions, popularByBoard, board, boardSubjects])

  function pickSubject(id: string) {
    setSubjectId(id)
    setSubjectQuery('')
  }

  function selectBoard(next: Board) {
    setBoard(next)
    setSubjectQuery('')
    if (subjectId) {
      const current = subjects.find((s) => s.id === subjectId)
      if (current && current.board !== next) setSubjectId('')
    }
  }

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
    if (!board) {
      setError('Choose Cambridge A-Level or IB Diploma first.')
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
      <p className="rc-composer-lead">Pick your exam board, then a subject room — Cambridge and IB stay separate.</p>

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
        {submitting ? (
          <div className="ec-loading-overlay" aria-live="polite">
            <ExamLoader size="md" rotateHints label="Publishing to Exam Room…" />
          </div>
        ) : null}
        {uploading ? (
          <div className="ec-loading-overlay ec-loading-overlay--light" aria-live="polite">
            <ExamLoader size="sm" label="Uploading files…" />
          </div>
        ) : null}
        <div className="rc-field">
          <span className="rc-label">Exam board</span>
          {selectedBoard && board ? (
            <div className="rc-board-selected">
              <span className="rc-board-selected-glyph" aria-hidden>{selectedBoard.glyph}</span>
              <div className="rc-board-selected-text">
                <strong>{selectedBoard.label}</strong>
                <span>{selectedBoard.sub}</span>
              </div>
              <button type="button" className="rc-subject-change" onClick={() => { setBoard(''); setSubjectId('') }}>
                Change
              </button>
            </div>
          ) : (
            <div className="rc-board-pick">
              {COMMUNITY_BOARDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`rc-board-pick-card${board === b.id ? ' on' : ''}`}
                  onClick={() => selectBoard(b.id)}
                >
                  <span className="rc-board-pick-glyph" aria-hidden>{b.glyph}</span>
                  <span className="rc-board-pick-label">{b.label}</span>
                  <span className="rc-board-pick-sub">{b.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {board ? (
          <div className="rc-field">
            <span className="rc-label">Subject · {selectedBoard?.short}</span>
            {selectedSubject ? (
              <div className="rc-subject-selected">
                <span className="rc-subject-selected-glyph" style={{ '--sc': selectedSubject.accent } as CSSProperties}>
                  {selectedSubject.glyph}
                </span>
                <span>s/{selectedSubject.id} · {selectedSubject.name}</span>
                <button type="button" className="rc-subject-change" onClick={() => setSubjectId('')}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  className="rc-input"
                  type="search"
                  placeholder={`Search ${selectedBoard?.short} subjects…`}
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                />
                <p className="rc-hint">
                  {subjectQuery.trim()
                    ? chipSubjects.length
                      ? `${chipSubjects.length} match${chipSubjects.length === 1 ? '' : 'es'}`
                      : 'No subjects match your search'
                    : chipSubjects.length
                      ? 'Popular subject rooms — or browse the full list below'
                      : 'No subject rooms found for this board.'}
                </p>
                {chipSubjects.length > 0 ? (
                  <div className="rc-subject-chips" role="listbox" aria-label={`${selectedBoard?.short} subject rooms`}>
                    {chipSubjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={subjectId === s.id}
                        className={`rc-subject-chip${subjectId === s.id ? ' on' : ''}`}
                        style={{ '--sc': s.accent } as CSSProperties}
                        onClick={() => pickSubject(s.id)}
                      >
                        <span className="rc-subject-chip-top">
                          <span className="rc-subject-option-glyph" aria-hidden>
                            {s.glyph}
                          </span>
                          <span className="rc-subject-chip-name">{s.name}</span>
                        </span>
                        <span className="rc-subject-chip-code">s/{s.id}</span>
                      </button>
                    ))}
                  </div>
                ) : subjectQuery.trim() && boardSubjects.length > 0 ? (
                  <p className="rc-hint">No subjects match your search — clear the filter above.</p>
                ) : null}
                <div className="rc-subject-browse">
                  <span className="rc-subject-browse-label">Or choose from full list</span>
                  <select
                    className="rc-input rc-subject-select"
                    value={subjectId}
                    onChange={(e) => pickSubject(e.target.value)}
                    aria-label={`Browse all ${selectedBoard?.short} subjects`}
                  >
                    <option value="" disabled>
                      Choose a subject room…
                    </option>
                    {boardSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · s/{s.id}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="rc-hint rc-hint-block">Select an exam board above to see its subject rooms.</p>
        )}

        <label className="rc-field">
          <span className="rc-label">Title</span>
          <input
            className="rc-input"
            placeholder="An interesting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={!board}
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
            disabled={!board}
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
            disabled={!board}
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
            disabled={!board || uploading || attachments.length >= 10}
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
          <button type="button" className="rc-btn rc-btn-primary" onClick={submit} disabled={submitting || uploading || !board || !selectedSubject}>
            {submitting ? (
              <ButtonLoadingState mode="exam" loadingText="Posting…" />
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
