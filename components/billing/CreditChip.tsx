'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink } from 'lucide-react'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'
import { tierMarketingName } from '@/lib/billing/caps'
import { billingPortalButtonLabel, useBillingPortal } from '@/lib/hooks/useBillingPortal'

type Summary = BillingSummaryClient

/** Tiny circular gauge — fraction of allowance remaining. */
function UsageRing({ fraction, tone }: { fraction: number; tone: string }) {
  const r = 6.5
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--ec-border)" strokeWidth="2.5" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${c * clamped} ${c}`}
      />
    </svg>
  )
}

function UsageMeter({
  label,
  used,
  cap,
  remaining,
  tone,
}: {
  label: string
  used: number
  cap: number
  remaining: number
  tone: string
}) {
  const pct = cap > 0 ? Math.max(0, Math.min(100, (used / cap) * 100)) : 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ec-text-faint)]">
          {label}
        </span>
        <span className="text-xs tabular-nums text-[var(--ec-text-secondary)]">
          <strong className="font-semibold text-[var(--ec-text-primary)]">{remaining}</strong>
          {' / '}
          {cap} left
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full"
        style={{ background: 'var(--ec-surface-muted)' }}
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={`${label}: ${remaining} of ${cap} left`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${100 - pct}%`, background: tone }}
        />
      </div>
    </div>
  )
}

export function CreditChip() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { state: portalState, openPortal } = useBillingPortal({
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

  const tierLabel =
    summary.access === 'trial' ? 'Trial' : tierMarketingName(summary.tier)
  const qLeft = Math.max(0, summary.questions.remaining)
  const oLeft = Math.max(0, summary.omni.remaining)
  const qCap = summary.questions.cap
  const oCap = summary.omni.cap
  const resetDate = summary.period_resets_at
    ? new Date(summary.period_resets_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  const qFraction = qCap > 0 ? qLeft / qCap : 0
  const blocked =
    summary.enforcement_mode === 'enforce' &&
    summary.questions.blocked &&
    summary.credit_balance <= 0
  const low = qFraction <= 0.2
  const ringTone = blocked
    ? 'var(--ec-chip-critical-text)'
    : low
      ? 'var(--ec-chip-warning-text)'
      : 'var(--ec-brand)'

  return (
    <div className="relative min-w-0" ref={ref}>
      {/* Minimal gauge chip — full breakdown lives in the popover. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${tierLabel} plan — ${qLeft} questions and ${oLeft} chat messages left`}
        title={`${tierLabel} · ${qLeft} questions · ${oLeft} chat left`}
        className="relative flex h-8 max-w-full items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular-nums transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border))]"
        style={{
          borderColor: 'var(--ec-border)',
          color: 'var(--ec-text-secondary)',
          background: 'color-mix(in srgb, var(--ec-canvas) 60%, transparent)',
        }}
      >
        <UsageRing fraction={qFraction} tone={ringTone} />
        <span className="whitespace-nowrap">{qLeft}</span>
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
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-[var(--ec-text-primary)]">{tierLabel} plan</p>
              {resetDate && (
                <p className="text-xs text-[var(--ec-text-faint)]">Resets {resetDate}</p>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <UsageMeter
                label="Marked questions"
                used={Math.max(0, qCap - qLeft)}
                cap={qCap}
                remaining={qLeft}
                tone={ringTone}
              />
              <UsageMeter
                label="Study chat"
                used={Math.max(0, oCap - oLeft)}
                cap={oCap}
                remaining={oLeft}
                tone={
                  oCap > 0 && oLeft / oCap <= 0.2
                    ? 'var(--ec-chip-warning-text)'
                    : 'var(--ec-brand)'
                }
              />
            </div>

            {summary.credit_balance > 0 && (
              <p className="mt-3 text-[var(--ec-brand)]">
                {summary.credit_balance} credits (questions or study chat)
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
                    {billingPortalButtonLabel(portalState, 'Manage plan')}
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
              <Link
                href="/account/billing"
                className="ec-link mx-auto text-xs"
                onClick={() => setOpen(false)}
              >
                Usage &amp; billing settings
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
