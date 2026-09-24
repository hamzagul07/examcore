'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'
import { tierMarketingName } from '@/lib/billing/caps'
import { billingPortalButtonLabel, useBillingPortal } from '@/lib/hooks/useBillingPortal'

type Summary = BillingSummaryClient

/** Popover exit — keep in step with `--ec-dur-press`. */
const POPOVER_EXIT_MS = 120

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
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]">
          {label}
        </span>
        <span className="text-xs tabular-nums text-[var(--ec-text-secondary)]">
          <strong className="font-semibold text-[var(--ec-text-primary)]">{remaining}</strong>
          {' / '}
          {cap} left
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-[2px] border border-[var(--ec-border)]"
        style={{ background: 'var(--ec-paper, var(--ec-surface-muted))' }}
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={`${label}: ${remaining} of ${cap} left`}
      >
        <div
          className="h-full rounded-[1px] transition-[width] duration-300"
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
  // The popover stays mounted for one short beat after closing so it can
  // animate out; `open` alone drives aria-expanded and the dismiss listeners.
  const [closing, setClosing] = useState(false)
  const wasOpen = useRef(false)
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (wasOpen.current && !open) {
      setClosing(true)
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const id = window.setTimeout(() => setClosing(false), reduce ? 0 : POPOVER_EXIT_MS)
      wasOpen.current = false
      return () => window.clearTimeout(id)
    }
    if (open) {
      wasOpen.current = true
      setClosing(false)
    }
  }, [open])

  if (loading || !summary?.signedIn) return null

  const tierLabel = tierMarketingName(summary.tier)
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
        className="relative flex h-8 max-w-full items-center gap-1 rounded border px-2 font-mono text-[11px] font-semibold tabular-nums transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border))]"
        style={{
          borderColor: 'var(--ec-border)',
          color: 'var(--ec-text-secondary)',
          background: 'var(--ec-paper, var(--ec-surface))',
          boxShadow: 'var(--ec-shadow-hard, 2px 2px 0 rgba(0, 0, 0, 0.06))',
        }}
      >
        <UsageRing fraction={qFraction} tone={ringTone} />
        <span className="whitespace-nowrap">{qLeft}</span>
      </button>

      {(open || closing) && (
        <>
          {/* Mobile scrim + click-catcher. Ink-tinted so it reads as the same
              paper going into shadow on both themes. */}
          <button
            type="button"
            aria-label="Close plan details"
            data-state={open ? 'open' : 'closing'}
            className="fixed inset-0 z-[55] bg-[color-mix(in_srgb,var(--ec-text-primary)_20%,transparent)] transition-opacity duration-[var(--ec-dur-pop)] ease-[var(--ec-ease-out)] starting:opacity-0 data-[state=closing]:pointer-events-none data-[state=closing]:opacity-0 data-[state=closing]:duration-[var(--ec-dur-press)] motion-reduce:transition-none sm:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Grows from the trigger (top edge on mobile, top-right on desktop):
              4px + 2% scale in over --ec-dur-pop, back out over --ec-dur-press. */}
          <div
            role="dialog"
            aria-label="Plan usage"
            data-state={open ? 'open' : 'closing'}
            inert={!open || undefined}
            className="ec-card ec-card--paper fixed left-3 right-3 top-[calc(3.25rem+env(safe-area-inset-top,0px))] z-[60] max-h-[min(70dvh,24rem)] origin-top overflow-y-auto p-4 text-sm transition-[opacity,translate,scale] duration-[var(--ec-dur-pop)] ease-[var(--ec-ease-out)] starting:-translate-y-1 starting:scale-[0.98] starting:opacity-0 data-[state=closing]:pointer-events-none data-[state=closing]:-translate-y-1 data-[state=closing]:scale-[0.98] data-[state=closing]:opacity-0 data-[state=closing]:duration-[var(--ec-dur-press)] motion-reduce:transition-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-h-none sm:origin-top-right"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-[var(--ec-text-primary)]">{tierLabel} plan</p>
              {resetDate && (
                <p className="text-xs text-[var(--ec-text-secondary)]">Resets {resetDate}</p>
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
              <p className="ec-card ec-card--paper mt-3 border ec-tint-critical-panel px-3 py-2 text-xs leading-relaxed">
                You&apos;ve hit your monthly question cap. Marking and whole papers
                are paused until you upgrade, top up credits, or your allowance
                resets.
              </p>
            )}
          {summary.enforcement_mode === 'warn' &&
            summary.questions.remaining <= 0 &&
            summary.credit_balance <= 0 && (
              <p className="ec-card ec-card--paper mt-3 border ec-highlight-warning-panel px-3 py-2 text-xs leading-relaxed">
                Warning mode: you&apos;re over your monthly cap but can still
                submit for now. Upgrade or top up before enforce goes live.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={portalState === 'loading'}
                aria-busy={portalState === 'loading' || undefined}
                data-loading={portalState === 'loading' ? 'true' : undefined}
                className="ec-btn-secondary w-full justify-center text-body"
              >
                {/* The label holds still while the portal opens; the trailing
                    glyph slot swaps for a spinner of the same size, so the
                    control never changes width or height. */}
                <span>
                  {portalState === 'loading'
                    ? 'Manage plan'
                    : billingPortalButtonLabel(portalState, 'Manage plan')}
                </span>
                {portalState === 'loading' && (
                  <span className="sr-only">
                    {billingPortalButtonLabel(portalState, 'Manage plan')}
                  </span>
                )}
                <span className="inline-grid h-3.5 w-3.5 shrink-0 place-items-center" aria-hidden>
                  {portalState === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold tracking-wide">↗</span>
                  )}
                </span>
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
