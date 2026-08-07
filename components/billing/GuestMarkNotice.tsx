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
      Marking as a guest —{' '}
      {ANON_DAILY_MARK_LIMIT === 1
        ? 'one free mark'
        : `up to ${ANON_DAILY_MARK_LIMIT} marks a day`}{' '}
      from this network, and it isn&apos;t saved. Cambridge and IB Diploma supported.{' '}
      <Link href={buildMarketingSignUpHref()} className="ec-link ec-link-touch">
        Create a free account
      </Link>{' '}
      to keep it — no card required.{' '}
      <Link href="/faq" className="ec-link ec-link-touch">
        FAQ
      </Link>
    </p>
  )
}
