'use client'

import Link from 'next/link'
import { X, AlertTriangle } from 'lucide-react'

export type ApproachingLimitBannerProps = {
  used: number
  cap: number
  onDismiss: () => void
}

/**
 * Subtle "approaching limit" banner shown at 80%+ of cap. Only rendered when the
 * API set `_allowance.warning = true` (warn/enforce modes). Dismissible per
 * session by the parent.
 */
export function ApproachingLimitBanner({ used, cap, onDismiss }: ApproachingLimitBannerProps) {
  return (
    <div
      className="mb-5 flex items-center gap-3 rounded-2xl border ec-highlight-warning-panel px-4 py-3"
      role="status"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 ec-score-mid" />
      <p className="min-w-0 flex-1 text-sm text-[var(--ec-text-primary)]">
        You&apos;ve used {used} of your {cap} questions this month.{' '}
        <Link href="/pricing" className="ec-link">
          See plans →
        </Link>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
