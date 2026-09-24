'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SubjectOption = { code: string; label: string }

/**
 * A creator turns a tip into a marked question. Title and tip are theirs; the
 * question can be pasted or pulled from the bank for the subject.
 */
export function TipTestForm({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')
  const [subjectCode, setSubjectCode] = useState(subjects[0]?.code ?? '')
  const [questionText, setQuestionText] = useState('')
  const [totalMarks, setTotalMarks] = useState('6')
  const [busy, setBusy] = useState<'idle' | 'suggesting' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function suggest() {
    if (!subjectCode) return
    setBusy('suggesting')
    setError(null)
    try {
      const res = await fetch(`/api/mark/starter-question?subject=${encodeURIComponent(subjectCode)}`)
      const data = (await res.json()) as {
        found?: boolean
        question_text?: string
        total_marks?: number
      }
      if (data.question_text) {
        setQuestionText(data.question_text)
        if (data.total_marks) setTotalMarks(String(data.total_marks))
      } else {
        setError('No banked question for that subject yet — paste one.')
      }
    } catch {
      setError('Could not fetch a question. Paste one instead.')
    } finally {
      setBusy('idle')
    }
  }

  async function submit() {
    setBusy('saving')
    setError(null)
    setSaved(null)
    try {
      const res = await fetch('/api/creators/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tip, subjectCode, questionText, totalMarks: Number(totalMarks) }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; href?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not save the tip test.')
        return
      }
      setSaved(data.href ?? null)
      setTitle('')
      setTip('')
      setQuestionText('')
      router.refresh()
    } catch {
      setError('Could not save the tip test.')
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className="ms-cr-form" aria-label="New tip test">
      <div className="ms-cr-form__grid">
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">The tip, in one line</span>
          <input
            className="ec-input"
            value={title}
            maxLength={90}
            placeholder="Define the command word before you answer"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Subject</span>
          <select
            className="ec-input select-chevron appearance-none"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="ms-cr-form__field">
        <span className="ms-cr-form__label">How to use it (what your followers should do)</span>
        <textarea
          className="ec-input"
          rows={3}
          value={tip}
          maxLength={600}
          placeholder="Underline the command word. 'Explain' wants a because; 'describe' wants a what. Write the first sentence to match it."
          onChange={(e) => setTip(e.target.value)}
        />
      </label>
      <label className="ms-cr-form__field">
        <span className="ms-cr-form__label">
          The question they answer
          <button
            type="button"
            className="ms-cr-copy"
            style={{ marginLeft: 10 }}
            disabled={busy !== 'idle' || !subjectCode}
            onClick={() => void suggest()}
          >
            {busy === 'suggesting' ? 'Finding…' : 'Suggest a banked question'}
          </button>
        </span>
        <textarea
          className="ec-input"
          rows={5}
          value={questionText}
          maxLength={4000}
          placeholder="Paste a past-paper question, or pull one from the bank."
          onChange={(e) => setQuestionText(e.target.value)}
        />
      </label>
      <div className="ms-cr-form__grid ms-cr-form__grid--end">
        <label className="ms-cr-form__field" style={{ maxWidth: 160 }}>
          <span className="ms-cr-form__label">Total marks</span>
          <input
            className="ec-input"
            type="number"
            min={1}
            max={50}
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="ec-btn-primary inline-flex min-h-[44px] items-center px-5"
          disabled={busy !== 'idle'}
          onClick={() => void submit()}
        >
          {busy === 'saving' ? 'Saving…' : 'Publish tip test'}
        </button>
      </div>
      {error ? <p className="ms-cr-chip__note" role="alert">{error}</p> : null}
      {saved ? (
        <p className="ms-cr-chip__note ms-cr-chip__note--gift" role="status">
          Published. Share it: {saved}
        </p>
      ) : null}
    </div>
  )
}
