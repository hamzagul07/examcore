'use client'

import { useState } from 'react'
import Link from 'next/link'

type Hit = {
  id: string
  kind: 'question' | 'note'
  title: string
  href: string
  subjectCode: string
  snippet: string
}

export function ExamRoomSearch({ subjectCode }: { subjectCode?: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    const query = q.trim()
    if (query.length < 2) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (subjectCode) params.set('subject', subjectCode)
      const res = await fetch(`/api/community/search?${params}`)
      const data = await res.json()
      setHits(Array.isArray(data.hits) ? data.hits : [])
    } catch {
      setHits([])
    }
    setLoading(false)
  }

  return (
    <section className="exam-room-section">
      <h2>Search Exam Room</h2>
      <p className="exam-room-section-sub">Find doubts and cheat sheets across published content.</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
        <input
          className="community-input"
          style={{ flex: '1 1 220px', maxWidth: 420 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search doubts and notes…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search()
          }}
        />
        <button type="button" className="ec-btn-primary text-sm" onClick={() => void search()} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      {hits.length ? (
        <ul className="exam-room-feed">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <Link href={h.href} className="exam-room-card">
                <span className="exam-room-anchor">
                  {h.kind === 'question' ? 'Doubt' : 'Cheat sheet'} · {h.subjectCode}
                </span>
                <div className="exam-room-card-title">{h.title}</div>
                <div className="exam-room-card-meta">{h.snippet}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
