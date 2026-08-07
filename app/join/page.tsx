'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'
import { isValidInviteCode, normalizeInviteCode } from '@/lib/teacher/invite-code'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  // Normalised here as well as at the route, so the student is sent to a URL
  // that will resolve rather than to a 'code not found' page for a code they
  // typed exactly as it appeared on the board.
  const normalized = normalizeInviteCode(code)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isValidInviteCode(normalized)) {
      router.push(`/join/${normalized}`)
    }
  }

  return (
    <div className="ms-join-card ec-card p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ec-icon-hero-gradient">
        <BookOpen className="h-8 w-8 ec-text-brand" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
        Join a classroom
      </h1>
      <p className="mb-8 text-[var(--ec-text-secondary)]">
        Enter the invite code your teacher gave you.
      </p>

      <form onSubmit={submit}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABC-123"
          // Room for the display hyphen and for the older 8-character codes
          // still held by classrooms created before the format changed.
          maxLength={13}
          className="ms-join-code-input ec-input mb-4 text-center font-mono text-xl tracking-widest sm:text-2xl"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          // A code is typed once, in a hurry, on a phone.
          inputMode="text"
          autoCapitalize="characters"
        />
        <button
          type="submit"
          className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center gap-2"
          disabled={!isValidInviteCode(normalized)}
        >
          Continue <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
