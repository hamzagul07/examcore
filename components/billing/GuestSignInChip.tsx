'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buildSignInHref, isSafeNextPath } from '@/lib/auth-redirect'

/** Compact sign-in CTA in the app header when the user is a guest. */
export function GuestSignInChip() {
  const pathname = usePathname()
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

  const next = isSafeNextPath(pathname) ? pathname : '/dashboard'

  return (
    <Link
      href={buildSignInHref(next)}
      className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 py-2 text-xs font-semibold text-[var(--ec-text-secondary)] transition-colors hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)] sm:px-3.5"
    >
      Sign in
    </Link>
  )
}
