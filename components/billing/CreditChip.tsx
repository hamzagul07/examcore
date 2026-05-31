'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Zap, Loader2 } from 'lucide-react'

type Summary = {
  signedIn: boolean
  tier: 'free' | 'student' | 'unlimited'
  status: string
  unlimited: boolean
  marks_used: number
  cap: number | null
  remaining: number | null
  credit_balance: number
  founding_member: boolean
  period_resets_at: string | null
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  student: 'Student',
  unlimited: 'Unlimited',
}

/**
 * Header chip: tier + remaining marks (Option A: `[ Student · 47 left ]`).
 * Refetches on the `ec:billing-refresh` window event (dispatched after a mark)
 * so the count visibly decrements. Click opens a small popover.
 */
export function CreditChip() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    // Async wrapper: state updates happen after the await, not synchronously
    // in the effect body.
    void (async () => {
      await load()
    })()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => window.removeEventListener('ec:billing-refresh', onRefresh)
  }, [load])

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: '/account' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
    } catch {
      /* ignore */
    }
    setPortalLoading(false)
  }

  if (loading || !summary?.signedIn) return null

  const tierLabel = TIER_LABELS[summary.tier] ?? summary.tier
  const countLabel = summary.unlimited
    ? '∞'
    : `${Math.max(0, summary.remaining ?? 0)} left`
  const creditSuffix = summary.credit_balance > 0 ? ` · +${summary.credit_balance} credits` : ''
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
        className="flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          borderColor: 'var(--ec-border)',
          color: 'var(--ec-text-secondary)',
          background: 'color-mix(in srgb, var(--ec-canvas) 60%, transparent)',
        }}
      >
        <Zap className="h-3.5 w-3.5 text-emerald-400" />
        <span className="hidden sm:inline">{tierLabel} · </span>
        {summary.unlimited ? '∞' : countLabel}
        <span className="hidden text-emerald-400 sm:inline">{creditSuffix}</span>
      </button>

      {open && (
        <div
          role="dialog"
          className="ec-card absolute right-0 z-50 mt-2 w-64 p-4 text-sm"
        >
          <p className="font-semibold text-[var(--ec-text-primary)]">{tierLabel} plan</p>
          {!summary.unlimited && (
            <p className="mt-1 text-[var(--ec-text-secondary)]">
              {Math.max(0, summary.remaining ?? 0)} of {summary.cap} marks left
              {resetDate ? ` · resets ${resetDate}` : ''}
            </p>
          )}
          {summary.unlimited && (
            <p className="mt-1 text-[var(--ec-text-secondary)]">Unlimited marks.</p>
          )}
          {summary.credit_balance > 0 && (
            <p className="mt-1 text-emerald-400">{summary.credit_balance} credits available</p>
          )}
          {summary.founding_member && (
            <p className="mt-2 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Founding member · 50% off
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="ec-btn-secondary w-full justify-center text-xs"
            >
              {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Manage plan'}
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
