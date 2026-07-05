'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, MessageCircle, PenLine, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorBox } from '@/components/AuthFormBits'
import {
  billingPortalButtonLabel,
  useBillingPortal,
} from '@/lib/hooks/useBillingPortal'
import { DISPLAY_PRICES_USD } from '@/lib/polar/products'
import type { SettingsBilling } from '@/lib/settings/types'

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  student: 'Pro',
  scholar: 'Scholar',
  mastery: 'Max',
}

type StatusTone = 'success' | 'info' | 'warning' | 'critical' | 'neutral'

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: 'Active', tone: 'success' },
  trialing: { label: 'Free trial', tone: 'info' },
  past_due: { label: 'Past due', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'neutral' },
  incomplete: { label: 'Incomplete', tone: 'warning' },
  incomplete_expired: { label: 'Expired', tone: 'neutral' },
  unpaid: { label: 'Unpaid', tone: 'critical' },
}

const TONE_STYLE: Record<StatusTone, React.CSSProperties> = {
  success: { background: 'var(--ec-chip-success-bg)', color: 'var(--ec-chip-success-text)' },
  info: { background: 'var(--ec-chip-info-bg)', color: 'var(--ec-chip-info-text)' },
  warning: { background: 'var(--ec-chip-warning-bg)', color: 'var(--ec-chip-warning-text)' },
  critical: { background: 'var(--ec-chip-critical-bg)', color: 'var(--ec-chip-critical-text)' },
  neutral: { background: 'var(--ec-chip-neutral-bg)', color: 'var(--ec-chip-neutral-text)' },
}

function formatUsd(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

function planPrice(tier: string, billingPeriod: string | null): string | null {
  if (tier !== 'student' && tier !== 'scholar' && tier !== 'mastery') return null
  const prices = DISPLAY_PRICES_USD[tier]
  return billingPeriod === 'yearly'
    ? `${formatUsd(prices.yearly)} / year`
    : `${formatUsd(prices.monthly)} / month`
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BillingSection({ billing }: { billing: SettingsBilling }) {
  const { state, errorMessage, openPortal } = useBillingPortal({
    returnUrl: '/account/billing',
  })

  const [syncFailed, setSyncFailed] = useState(false)

  const syncCustomer = useCallback(async () => {
    setSyncFailed(false)
    try {
      const res = await fetch('/api/billing/sync-customer', { method: 'POST' })
      if (!res.ok) throw new Error(`sync-customer ${res.status}`)
    } catch (err) {
      console.error('BillingSection: billing sync-customer failed', err)
      // Surface it — checkout/portal will fail later with no obvious cause.
      setSyncFailed(true)
    }
  }, [])

  useEffect(() => {
    if (!billing.hasCustomer) void syncCustomer()
  }, [billing.hasCustomer, syncCustomer])

  const isPaid = billing.tier !== 'free'
  const tierLabel = TIER_LABELS[billing.tier] ?? billing.tier
  const status = isPaid ? STATUS_META[billing.status] : null
  const isTrialing = isPaid && billing.status === 'trialing'
  const price = planPrice(billing.tier, billing.billingPeriod)
  const periodEnd = billing.currentPeriodEnd ? longDate(billing.currentPeriodEnd) : null
  const resetDate = billing.periodResetsAt
    ? new Date(billing.periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  const renewalLine = !isPaid
    ? 'Upgrade for higher limits, whole-paper marking, and the mastery dashboard.'
    : isTrialing
      ? periodEnd
        ? `Trial ends ${periodEnd} — your card is charged then. Cancel before that date and you pay nothing.`
        : 'Your free trial is active.'
      : billing.cancelAtPeriodEnd
        ? periodEnd
          ? `Your plan is set to cancel on ${periodEnd}. You keep full access until then.`
          : 'Your plan is set to cancel at the end of the period.'
        : periodEnd
          ? `Renews on ${periodEnd}${billing.billingPeriod === 'yearly' ? ' (yearly billing)' : ''}.`
          : null

  return (
    <div className="space-y-6">
      {/* ---- Current plan ---- */}
      <Card variant="glass" padding="lg" as="section" className="ms-settings-section relative overflow-hidden">
        {/* Soft brand wash behind the plan name — quiet, not a banner. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in srgb, var(--ec-brand) 16%, transparent), transparent)',
          }}
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-overline">Current plan</p>
            {status && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold"
                style={TONE_STYLE[status.tone]}
              >
                {status.label}
              </span>
            )}
            {isPaid && billing.cancelAtPeriodEnd && !isTrialing && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold"
                style={TONE_STYLE.warning}
              >
                Cancels soon
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--ec-text-primary)] sm:text-[2rem]">
              {tierLabel}
            </h2>
            {price && (
              <p className="text-body-large font-medium text-[var(--ec-text-secondary)]">{price}</p>
            )}
          </div>

          {renewalLine && (
            <p className="text-body mt-2 max-w-xl text-[var(--ec-text-secondary)]">{renewalLine}</p>
          )}

          <div className="ms-billing-actions mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {isPaid ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={() => void openPortal()}
                  isLoading={state === 'loading'}
                  loadingText="Opening billing portal…"
                  disabled={state === 'loading'}
                >
                  {billingPortalButtonLabel(state, 'Manage billing')}
                  {state !== 'loading' && <ExternalLink className="h-4 w-4" aria-hidden />}
                </Button>
                <Link href="/pricing" className="inline-flex w-full sm:w-auto">
                  <Button variant="ghost" size="md" type="button" fullWidth className="sm:w-auto">
                    Compare plans
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/pricing" className="inline-flex w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    fullWidth
                    className="sm:w-auto"
                    leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}
                  >
                    Upgrade plan
                  </Button>
                </Link>
                {billing.hasCustomer && (
                  <Button
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={() => void openPortal()}
                    disabled={state === 'loading'}
                  >
                    {billingPortalButtonLabel(state, 'Billing portal')}
                  </Button>
                )}
              </>
            )}
          </div>

          {isPaid && (
            <p className="text-caption mt-3">
              Invoices, payment method, and cancellation are all handled in the billing portal.
            </p>
          )}

          {state === 'opened' && (
            <p className="text-caption mt-3 font-medium ec-score-high">
              Taking you to the billing portal…
            </p>
          )}

          {(errorMessage || state === 'error') && (
            <div className="mt-4 space-y-2">
              <ErrorBox message={errorMessage} />
              <Button variant="secondary" size="md" type="button" onClick={() => void openPortal()}>
                Retry
              </Button>
            </div>
          )}

          {syncFailed && (
            <div className="text-body mt-4 rounded-2xl border ec-highlight-warning-panel px-4 py-3">
              <p className="ec-score-mid">
                Billing setup didn&apos;t finish — checkout and the billing portal may not work yet.
              </p>
              <button
                type="button"
                className="ec-link mt-1 text-sm underline"
                onClick={() => void syncCustomer()}
              >
                Retry billing setup
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ---- Usage this period ---- */}
      <Card variant="glass" padding="lg" as="section" className="ms-settings-section">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h3 text-[var(--ec-text-primary)]">Usage this period</h2>
          {resetDate && <p className="text-caption">Resets {resetDate}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UsageMeter
            icon={<PenLine className="h-4 w-4" aria-hidden />}
            label="Questions marked"
            used={billing.marksUsed}
            cap={billing.markCap}
            status={
              billing.questionsBlocked
                ? 'blocked'
                : billing.questionsWarning
                  ? 'warning'
                  : 'normal'
            }
          />
          <UsageMeter
            icon={<MessageCircle className="h-4 w-4" aria-hidden />}
            label="Study chat messages"
            used={billing.omniUsed}
            cap={billing.omniCap}
            status={
              billing.omniBlocked ? 'blocked' : billing.omniWarning ? 'warning' : 'normal'
            }
          />
        </div>

        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: 'var(--ec-border)', background: 'var(--ec-surface-raised)' }}
        >
          <div>
            <p className="label-overline">Credits</p>
            <p className="text-body mt-0.5 text-[var(--ec-text-secondary)]">
              <strong className="text-body-large font-semibold text-[var(--ec-text-primary)]">
                {billing.credits}
              </strong>{' '}
              remaining — credits cover extra questions or chat messages once caps run out.
            </p>
          </div>
          <Link href="/pricing#credits" className="ec-btn-secondary shrink-0 text-sm">
            Buy credits
          </Link>
        </div>

        {(billing.questionsBlocked || billing.omniBlocked) &&
          billing.enforcementMode === 'enforce' && (
            <p className="text-body mt-4 rounded-2xl border ec-tint-critical-panel px-4 py-3 ec-score-low">
              {billing.questionsBlocked && billing.omniBlocked
                ? 'Monthly question and study chat caps reached — marking and Ask MarkScheme are paused until you upgrade or top up credits.'
                : billing.questionsBlocked
                  ? 'Monthly question cap reached — marking and whole papers are paused until you upgrade or top up credits.'
                  : 'Monthly study chat cap reached — Ask MarkScheme is paused until you upgrade or top up credits.'}
            </p>
          )}

        {billing.enforcementMode === 'warn' &&
          (billing.marksUsed >= billing.markCap || billing.omniUsed >= billing.omniCap) &&
          billing.credits <= 0 && (
            <p className="text-body mt-4 rounded-2xl border ec-highlight-warning-panel px-4 py-3 ec-score-mid">
              You&apos;re over one or more monthly caps. Warning mode still allows usage — upgrade
              or top up before enforce goes live.
            </p>
          )}
      </Card>

      {/* ---- Recent activity ---- */}
      {billing.recentUsage.length > 0 && (
        <Card variant="glass" padding="lg" as="section" className="ms-settings-section">
          <h2 className="text-h3 mb-4 text-[var(--ec-text-primary)]">Recent activity</h2>
          <ul className="divide-y" style={{ borderColor: 'var(--ec-border)' }}>
            {billing.recentUsage.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 py-2.5 text-body"
              >
                <span className="min-w-0 truncate text-[var(--ec-text-primary)]">
                  {u.eventType === 'mark_whole_paper'
                    ? 'Whole paper'
                    : u.eventType === 'omni_message'
                      ? 'Study chat message'
                      : 'Single question'}
                  {u.source === 'credits' && (
                    <span className="ml-2 text-caption ec-score-high">(credit)</span>
                  )}
                </span>
                <span className="text-caption shrink-0">
                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function UsageMeter({
  icon,
  label,
  used,
  cap,
  status,
}: {
  icon: React.ReactNode
  label: string
  used: number
  cap: number
  status: 'normal' | 'warning' | 'blocked'
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, cap)) * 100))
  const remaining = Math.max(0, cap - used)
  const barColor =
    status === 'blocked'
      ? 'var(--ec-chip-critical-text)'
      : status === 'warning'
        ? 'var(--ec-chip-warning-text)'
        : 'var(--ec-brand)'

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: 'var(--ec-border)', background: 'var(--ec-surface-raised)' }}
    >
      <div className="flex items-center gap-2 text-[var(--ec-text-secondary)]">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: 'var(--ec-brand-muted)', color: 'var(--ec-brand)' }}
        >
          {icon}
        </span>
        <p className="label-overline">{label}</p>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-[var(--ec-text-primary)]">
          <span className="text-h3 font-semibold">{used}</span>
          <span className="text-body text-[var(--ec-text-secondary)]"> / {cap}</span>
        </p>
        <p className="text-caption">
          {status === 'blocked' ? 'Cap reached' : `${remaining} left`}
        </p>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={label}
        style={{ background: 'color-mix(in srgb, var(--ec-border) 80%, transparent)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
