'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Zap, Loader2, ExternalLink } from 'lucide-react'
import type { SubscriptionTier } from '@/lib/database.types'
import { stripePortalButtonLabel, useStripePortal } from '@/lib/hooks/useStripePortal'

type Summary = {
  signedIn: boolean
  tier: SubscriptionTier
  status: string
  founding_member: boolean
  credit_balance: number
  period_resets_at: string | null
  questions: {
    used: number
    cap: number
    remaining: number
    warning: boolean
  }
  omni: {
    used: number
    cap: number
    remaining: number
    warning: boolean
  }
}

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-[44px] max-w-[min(100vw-8rem,20rem)] items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors"
        style={{
          borderColor: 'var(--ec-border)',
          color: 'var(--ec-text-secondary)',
          background: 'color-mix(in srgb, var(--ec-canvas) 60%, transparent)',
        }}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--ec-brand)]" />
        <span className="hidden truncate sm:inline">{tierLabel} · </span>
        <span className="truncate">{chipLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          className="ec-card absolute right-0 z-50 mt-2 w-72 p-4 text-sm"
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
      )}
    </div>
  )
}
