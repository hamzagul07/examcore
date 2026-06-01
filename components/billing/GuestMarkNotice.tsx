'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ANON_DAILY_MARK_LIMIT } from '@/lib/rate-limit'

type Props = {
  className?: string
}

/** Shown to guests on the mark page — explains the IP daily cap before they hit it. */
export function GuestMarkNotice({ className = '' }: Props) {
  const [isGuest, setIsGuest] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user?: unknown }) => {
        if (!cancelled) setIsGuest(!data.user)
      })
      .catch(() => {
        if (!cancelled) setIsGuest(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isGuest) return null

  return (
    <p
      className={`rounded-2xl border ec-border-color ec-bg-surface-raised px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)] ${className}`}
    >
      Marking as a guest — up to {ANON_DAILY_MARK_LIMIT} marks per day from this network.{' '}
      <Link href="/auth/signup?redirect=%2Fmark" className="ec-link">
        Create a free account
      </Link>{' '}
      for your own monthly allowance.
    </p>
  )
}
