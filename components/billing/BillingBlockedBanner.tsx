'use client'

import Link from 'next/link'
import { Ban } from 'lucide-react'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'

type Props = {
  summary: BillingSummaryClient
  className?: string
}

/**
 * Non-dismissible banner when enforce mode blocks marking and/or Omni with no credits left.
 */
export function BillingBlockedBanner({ summary, className = '' }: Props) {
  const qBlocked = summary.questions.blocked
  const oBlocked = summary.omni.blocked

  if (!qBlocked && !oBlocked) return null

  const reset = summary.period_resets_at
    ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      })
    : null

  let message: string
  if (qBlocked && oBlocked) {
    message =
      "You've hit your monthly question and study chat caps. Marking, whole papers, and Ask MarkScheme are paused until you upgrade, top up credits, or your allowance resets."
  } else if (qBlocked) {
    message =
      "You've hit your monthly question cap. Marking and whole papers are paused until you upgrade, top up credits, or your allowance resets."
  } else {
    message =
      "You've hit your monthly study chat cap. Ask MarkScheme is paused until you upgrade, top up credits, or your allowance resets."
  }

  return (
    <div
      className={`ms-billing-blocked flex items-start gap-3 rounded-2xl border ec-tint-critical-panel px-4 py-3 ${className}`}
      role="alert"
    >
      <Ban className="mt-0.5 h-5 w-5 shrink-0 ec-score-low" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-[var(--ec-text-primary)]">
        <p>{message}</p>
        {reset && (
          <p className="mt-1 text-[var(--ec-text-secondary)]">Resets {reset}.</p>
        )}
        <p className="mt-2">
          <Link href="/pricing" className="ec-link">
            View plans
          </Link>
          {' · '}
          <Link href="/pricing#credits" className="ec-link">
            Top up credits
          </Link>
        </p>
      </div>
    </div>
  )
}
