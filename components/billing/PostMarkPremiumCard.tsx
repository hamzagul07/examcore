'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { GLOSS_VAULT } from '@/lib/copy/product-lexicon'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'

/**
 * Premium, visible where the marking happens — not only at the wall.
 *
 * Until this card, a free student met the paid tiers exactly once: as a 402
 * modal after their allowance ran out. This renders under every real result:
 *
 * - free tier: the allowance meter ("3 of 5 left this month") plus one
 *   concrete line about what a plan does with the leak they are looking at.
 * - paid tiers: nothing, until the API's approaching-cap warning — then a
 *   quiet meter with the reset date and a billing link. No pitch; they paid.
 *
 * Guests are handled by GuestConversionPrompt (signup, not payment) and the
 * worked example never shows this (no allowance was spent on it).
 *
 * Instrumented as upgrade_viewed{source:'post_mark_card'} / upsell_clicked so
 * the funnel readout can judge it — placement decisions here are measured,
 * not argued.
 */
export function PostMarkPremiumCard({ summary }: { summary: BillingSummaryClient | null }) {
  const seenRef = useRef(false)

  const variant: 'free' | 'paid-warning' | null = !summary?.signedIn
    ? null
    : summary.access === 'free'
      ? 'free'
      : summary.questions.warning
        ? 'paid-warning'
        : null

  useEffect(() => {
    if (!variant || seenRef.current) return
    seenRef.current = true
    trackFunnelEvent('upgrade_viewed', { source: 'post_mark_card', variant })
  }, [variant])

  if (!variant || !summary) return null

  const { remaining, cap } = summary.questions
  const resetsAt = summary.period_resets_at
    ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })
    : null

  if (variant === 'paid-warning') {
    return (
      <p className="pt-2 text-center text-sm text-[var(--ec-text-secondary)]">
        {remaining} of {cap} marks left this month
        {resetsAt ? <> — resets {resetsAt}</> : null}.{' '}
        <Link href="/account/billing" className="ec-link">
          Manage plan
        </Link>
      </p>
    )
  }

  return (
    <aside
      className="mt-4 rounded-xl border-2 border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-4 py-4 sm:px-5"
      style={{ boxShadow: 'var(--ec-shadow-hard, 4px 4px 0 rgba(0,0,0,0.10))' }}
      aria-label="Your marking allowance"
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-[var(--ec-text-secondary)]">
        {remaining} of {cap} free marks left this month
      </p>
      <p className="mt-1.5 text-sm text-[var(--ec-text-primary)]">
        Every mark you just dropped is a leak worth chasing. A plan takes
        marking to 50–250 questions a month, and the Vault —{' '}
        {GLOSS_VAULT} — rebuilds itself around each one.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          href="/pricing"
          className="ec-btn-primary ec-btn-primary--sm"
          onClick={() =>
            trackFunnelEvent('upsell_clicked', { source: 'post_mark_card' })
          }
        >
          See plans →
        </Link>
        {resetsAt ? (
          <span className="text-xs text-[var(--ec-text-secondary)]">
            free allowance resets {resetsAt}
          </span>
        ) : null}
      </div>
    </aside>
  )
}
