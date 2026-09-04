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

  const variant: 'free' | 'exhausted' | 'paid-warning' | null = !summary?.signedIn
    ? null
    : summary.access === 'free' && summary.questions.remaining <= 0
      ? 'exhausted'
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

  /**
   * The last free mark of the month, on screen the moment it lands.
   *
   * This is the only point in the product where the wall is actually reached —
   * and until now it was the same card as every other mark, differing by one
   * number ("0 of 5" instead of "3 of 5") and carrying the identical paragraph.
   *
   * Measured: three students used exactly five marks in a month and never came
   * back for a sixth. Nothing blocks until a sixth attempt, so none of them
   * ever saw a paywall — this card was the whole pitch, and it read as an
   * accounting statement at the instant their fifth result was on screen and
   * worth the most to them.
   *
   * It names what happened, says when it comes back, and offers the cheap door
   * as well as the expensive one. Of three sales this product has made, one was
   * a ten-dollar credit pack.
   */
  if (variant === 'exhausted') {
    return (
      <aside
        className="ms-postmark-exhausted mt-4"
        aria-label="You have used your free marks for this month"
      >
        <p className="ms-postmark-exhausted-label">That was your last free mark this month</p>
        <p className="ms-postmark-exhausted-body">
          You have marked {cap} {cap === 1 ? 'answer' : 'answers'} against the
          real scheme{resetsAt ? <> — the next {cap} arrive on {resetsAt}</> : null}.
          If you would rather not wait, you do not have to subscribe to carry on.
        </p>
        <div className="ms-postmark-exhausted-actions">
          <Link
            href="/pricing#credits"
            className="ec-btn-primary ec-btn-primary--sm"
            onClick={() =>
              trackFunnelEvent('upsell_clicked', { source: 'post_mark_exhausted_credits' })
            }
          >
            Buy marks outright →
          </Link>
          <Link
            href="/pricing"
            className="ec-btn-underline text-sm"
            onClick={() =>
              trackFunnelEvent('upsell_clicked', { source: 'post_mark_exhausted_plans' })
            }
          >
            Or see the plans
          </Link>
        </div>
        <p className="ms-postmark-exhausted-note">
          Credit packs are a one-off — they never expire, and no card stays on file.
        </p>
      </aside>
    )
  }

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
