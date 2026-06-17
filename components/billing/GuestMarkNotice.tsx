'use client'

import Link from 'next/link'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { ANON_DAILY_MARK_LIMIT } from '@/lib/rate-limit'

type Props = {
  className?: string
}

/** Shown to guests on the mark page — explains the IP daily cap before they hit it. */
export function GuestMarkNotice({ className = '' }: Props) {
  const { user, loading } = useAuthCheck()

  if (loading || user) return null

  return (
    <p
      className={`ms-guest-notice rounded-2xl border ec-border-color ec-bg-surface-raised px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)] ${className}`}
    >
      Marking as a guest — up to {ANON_DAILY_MARK_LIMIT} marks per day from this network.{' '}
      <Link href={buildMarketingSignUpHref()} className="ec-link inline-flex min-h-[44px] items-center">
        Create a free account
      </Link>{' '}
      for your own monthly allowance, plus a 7-day free trial of everything — no card.
    </p>
  )
}
