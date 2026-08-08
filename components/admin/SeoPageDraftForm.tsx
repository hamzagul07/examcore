'use client'

import { useState } from 'react'

export function SeoPageDraftForm() {
  const [concept, setConcept] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [gradeLevel, setGradeLevel] = useState('A-Level')
  const [prerequisites, setPrerequisites] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/admin/seo/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept,
          subjectCode: subjectCode || null,
          gradeLevel,
          prerequisites: prerequisites
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not save draft')
      setStatus('done')
      setConcept('')
      setPrerequisites('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save draft')
    }
  }

  return (
    <form onSubmit={onSubmit} className="ec-card space-y-3 p-5">
      <label className="block text-sm">
        Concept
        <input
          required
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--ec-border)] px-3 py-2"
          placeholder="Electric fields"
        />
      </label>
      <label className="block text-sm">
        Subject code
        <input
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--ec-border)] px-3 py-2"
          placeholder="9702"
        />
      </label>
      <label className="block text-sm">
        Level
        <input
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--ec-border)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Prerequisites (comma-separated)
        <input
          value={prerequisites}
          onChange={(e) => setPrerequisites(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--ec-border)] px-3 py-2"
          placeholder="9.1, 9.2"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'saving'}
        className="ec-btn-primary min-h-[44px]"
      >
        {status === 'saving' ? 'Saving…' : 'Create draft structure'}
      </button>
      {status === 'done' ? (
        <p className="text-sm text-[var(--ec-brand)]">Draft saved — review before publish.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--ec-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
