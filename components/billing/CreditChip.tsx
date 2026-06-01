'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Zap, Loader2, ExternalLink } from 'lucide-react'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'
import { stripePortalButtonLabel, useStripePortal } from '@/lib/hooks/useStripePortal'

type Summary = BillingSummaryClient

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  student: 'Student',
  scholar: 'Scholar',
  mastery: 'Mastery',
}

export function CreditChip() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { state: portalState, openPortal } = useStripePortal({
    returnUrl: '/account/billing',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/summary', { cache: 'no-store' })
      if (!res.ok) {
        setSummary(null)
        return
      }
      setSummary((await res.json()) as Summary)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (loading || !summary?.signedIn) return null

  const tierLabel = TIER_LABELS[summary.tier] ?? summary.tier
  const qLeft = Math.max(0, summary.questions.remaining)
  const oLeft = Math.max(0, summary.omni.remaining)
  const chipLabel = `${qLeft} questions · ${oLeft} Omni`
  const resetDate = summary.period_resets_at
    ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${tierLabel} plan — ${chipLabel}`}
        className="flex min-h-[44px] items-center gap-1 rounded-full border px-2.5 py-2 text-xs font-semibold transition-colors sm:max-w-[min(100vw-8rem,20rem)] sm:gap-1.5 sm:px-3"
        style={{
          borderColor: 'var(--ec-border)',
          color: 'var(--ec-text-secondary)',
          background: 'color-mix(in srgb, var(--ec-canvas) 60%, transparent)',
        }}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--ec-brand)]" />
        <span className="whitespace-nowrap sm:hidden">{qLeft}Q</span>
        <span className="hidden truncate sm:inline">
          {tierLabel} · {chipLabel}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close plan details"
            className="fixed inset-0 z-[55] bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Plan usage"
            className="ec-card fixed left-3 right-3 top-[calc(3.25rem+env(safe-area-inset-top,0px))] z-[60] max-h-[min(70dvh,24rem)] overflow-y-auto p-4 text-sm sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-h-none"
          >
            <p className="font-semibold text-[var(--ec-text-primary)]">{tierLabel} plan</p>
            <p className="mt-1 text-[var(--ec-text-secondary)]">
              {qLeft} of {summary.questions.cap} questions left
              {resetDate ? ` · resets ${resetDate}` : ''}
            </p>
            <p className="mt-1 text-[var(--ec-text-secondary)]">
              {oLeft} of {summary.omni.cap} Omni messages left
            </p>
            {summary.credit_balance > 0 && (
              <p className="mt-1 text-[var(--ec-brand)]">
                {summary.credit_balance} credits (questions or Omni)
              </p>
            )}
          {summary.founding_member && (
            <p className="mt-2 inline-block rounded-full bg-[var(--ec-brand-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ec-brand)]">
              Founding member · 50% off
            </p>
          )}
          {summary.enforcement_mode === 'enforce' &&
            summary.questions.blocked &&
            summary.credit_balance <= 0 && (
              <p className="mt-3 rounded-xl border ec-tint-critical-panel px-3 py-2 text-xs leading-relaxed">
                You&apos;ve hit your monthly question cap. Marking and whole papers
                are paused until you upgrade, top up credits, or your allowance
                resets.
              </p>
            )}
          {summary.enforcement_mode === 'warn' &&
            summary.questions.remaining <= 0 &&
            summary.credit_balance <= 0 && (
              <p className="mt-3 rounded-xl border ec-highlight-warning-panel px-3 py-2 text-xs leading-relaxed">
                Warning mode: you&apos;re over your monthly cap but can still
                submit for now. Upgrade or top up before enforce goes live.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={portalState === 'loading'}
                className="ec-btn-secondary w-full justify-center text-body"
              >
                {portalState === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    {stripePortalButtonLabel(portalState, 'Manage plan')}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </button>
              <Link
                href="/pricing#credits"
                className="ec-btn-primary w-full justify-center text-xs"
                onClick={() => setOpen(false)}
              >
                Buy more credits
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
