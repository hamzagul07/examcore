'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buildSignInHref, isSafeNextPath } from '@/lib/auth-redirect'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

/** Compact sign-in CTA in the app header when the user is a guest (mobile only). */
export function GuestSignInChip() {
  const pathname = usePathname()
  const { user, loading } = useAuthCheck()

  if (loading || user) return null

  const next = isSafeNextPath(pathname) ? pathname : '/dashboard'

  return (
    <Link
      href={buildSignInHref(next)}
      className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 py-2 text-xs font-semibold text-[var(--ec-text-secondary)] transition-colors hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)] min-[901px]:hidden sm:px-3.5"
    >
      Sign in
    </Link>
  )
}
