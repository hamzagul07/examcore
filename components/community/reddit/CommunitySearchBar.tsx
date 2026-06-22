'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CommunitySearchBar({ subjectCode, defaultValue = '' }: { subjectCode?: string; defaultValue?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)

  function go(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query.length < 2) return
    const params = new URLSearchParams({ q: query })
    if (subjectCode) params.set('subject', subjectCode)
    router.push(`/community/search?${params.toString()}`)
  }

  return (
    <form onSubmit={go} className="rc-searchbar">
      <span className="rc-searchbar-icon" aria-hidden>🔍</span>
      <input
        className="rc-searchbar-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={subjectCode ? `Search s/${subjectCode}…` : 'Search the Exam Room…'}
        aria-label="Search community"
      />
    </form>
  )
}
