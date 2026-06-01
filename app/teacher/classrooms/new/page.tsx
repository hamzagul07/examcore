'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'

export default function NewClassroomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/teacher/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.details || data.error || 'Failed to create classroom')
      return
    }

    router.push('/teacher/dashboard')
    router.refresh()
  }

  return (
    <TeacherPageContainer className="max-w-lg">
      <TeacherBackLink href="/teacher/dashboard">← Back to dashboard</TeacherBackLink>
      <TeacherPageHeader label="NEW CLASSROOM" title="Create a classroom" />

      <form onSubmit={handleSubmit} className="ec-card space-y-4 p-8">
        <div>
          <label className="ec-label-tech mb-2 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Year 13 A-Level Maths"
            className="ec-input w-full"
            required
          />
        </div>
        <div>
          <label className="ec-label-tech mb-2 block">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="ec-input w-full resize-none"
            rows={3}
          />
        </div>
        {error && <p className="text-sm ec-score-low">{error}</p>}
        <button type="submit" disabled={loading} className="ec-btn-primary w-full">
          {loading ? 'Creating...' : 'Create classroom'}
        </button>
      </form>
    </TeacherPageContainer>
  )
}
