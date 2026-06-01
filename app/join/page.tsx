'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="ec-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ec-icon-hero-gradient">
        <BookOpen className="h-8 w-8 ec-text-brand" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-[var(--ec-text-primary)]">
        Join a classroom
      </h1>
      <p className="mb-8 text-[var(--ec-text-secondary)]">
        Enter the invite code your teacher gave you.
      </p>

      <form onSubmit={submit}>
        <input
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/\s/g, ''))
          }
          placeholder="e.g. A3F9B2D1"
          maxLength={8}
          className="ec-input mb-4 text-center font-mono text-2xl tracking-widest"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center gap-2"
          disabled={code.length < 4}
        >
          Continue <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
