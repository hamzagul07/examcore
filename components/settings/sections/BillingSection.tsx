'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorBox } from '@/components/AuthFormBits'
import {
  stripePortalButtonLabel,
  useStripePortal,
} from '@/lib/hooks/useStripePortal'
import type { SettingsBilling } from '@/lib/settings/types'
import {
  SettingsSectionCard,
  SettingsStatTile,
} from '@/components/settings/SettingsSectionCard'

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  student: 'Student',
  scholar: 'Scholar',
  mastery: 'Mastery',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  unpaid: 'Unpaid',
}

export function BillingSection({ billing }: { billing: SettingsBilling }) {
  const { state, errorMessage, openPortal } = useStripePortal({
    returnUrl: '/account/billing',
  })

  useEffect(() => {
    if (!billing.hasCustomer) {
      void fetch('/api/billing/sync-customer', { method: 'POST' }).catch((err) =>
        console.error('BillingSection: billing sync-customer failed', err)
      )
    }
  }, [billing.hasCustomer])

  const tierLabel = TIER_LABELS[billing.tier] ?? billing.tier
  const statusLabel = STATUS_LABELS[billing.status] ?? billing.status
  const renews = billing.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  const isPaid = billing.tier !== 'free'

  const qPct = Math.min(
    100,
    Math.round((billing.marksUsed / Math.max(1, billing.markCap)) * 100)
  )
  const omniPct = Math.min(
    100,
    Math.round((billing.omniUsed / Math.max(1, billing.omniCap)) * 100)
  )
  const resetDate = billing.periodResetsAt
    ? new Date(billing.periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  const periodLabel =
    billing.billingPeriod === 'yearly'
      ? 'Yearly'
      : billing.billingPeriod === 'monthly'
        ? 'Monthly'
        : null

  const enforcementLabel =
    billing.enforcementMode === 'enforce'
      ? 'Limits enforced'
      : billing.enforcementMode === 'warn'
        ? 'Warning mode'
        : null

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Billing"
        description="Your plan, usage, and payment management."
      >
        {enforcementLabel && (
          <p
            className={`mb-4 inline-flex rounded-full px-3 py-1 text-caption font-semibold ${
              billing.enforcementMode === 'enforce'
                ? 'ec-tint-critical-panel ec-score-low'
                : 'ec-highlight-warning-panel ec-score-mid'
            }`}
          >
            {enforcementLabel}
          </p>
        )}

        {billing.foundingMember && (
          <span
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold"
            style={{
              background: 'var(--ec-chip-success-bg)',
              color: 'var(--ec-chip-success-text)',
            }}
          >
            Founding member · 50% off forever
          </span>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SettingsStatTile label="Plan" value={tierLabel} />
          <SettingsStatTile label="Status" value={statusLabel} />
          <SettingsStatTile label="Credits" value={String(billing.credits)} />
        </div>

        {isPaid && periodLabel && renews && (
          <p className="text-body mt-4">
            {billing.cancelAtPeriodEnd ? (
              <>
                Cancels on <strong className="text-[var(--ec-text-primary)]">{renews}</strong>
                {periodLabel ? ` · ${periodLabel} billing` : ''}
              </>
            ) : (
              <>
                Renews on <strong className="text-[var(--ec-text-primary)]">{renews}</strong>
                {periodLabel ? ` · ${periodLabel} billing` : ''}
              </>
            )}
          </p>
        )}

        <UsageBar
          className="mt-6"
          label="Questions this period"
          used={billing.marksUsed}
          cap={billing.markCap}
          pct={qPct}
          resetDate={resetDate}
          status={
            billing.questionsBlocked
              ? 'blocked'
              : billing.questionsWarning
                ? 'warning'
                : 'normal'
          }
        />

        <UsageBar
          className="mt-4"
          label="Study chat messages this period"
          used={billing.omniUsed}
          cap={billing.omniCap}
          pct={omniPct}
          status={
            billing.omniBlocked ? 'blocked' : billing.omniWarning ? 'warning' : 'normal'
          }
        />

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

        {billing.recentUsage.length > 0 && (
          <div
            className="mt-6 rounded-2xl border px-4 py-3"
            style={{
              borderColor: 'var(--ec-border)',
              background: 'var(--ec-surface-raised)',
            }}
          >
            <p className="label-overline mb-2">Recent activity</p>
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
                        ? 'study chat message'
                        : 'Single question'}
                    {u.source === 'credits' && (
                      <span
                        className="ml-2 text-caption ec-score-high"
                      >
                        (credit)
                      </span>
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
          </div>
        )}

        {(errorMessage || state === 'error') && (
          <div className="mt-4 space-y-2">
            <ErrorBox message={errorMessage} />
            <Button variant="secondary" size="md" type="button" onClick={() => void openPortal()}>
              Retry
            </Button>
          </div>
        )}

        {state === 'opened' && (
          <p
            className="text-caption mt-4 font-medium ec-score-high"
          >
            Opened in new tab — you can keep using MarkScheme here.
          </p>
        )}

        <div className="ms-billing-actions mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => void openPortal()}
            isLoading={state === 'loading'}
            loadingText="Opening your billing portal…"
            disabled={state === 'loading'}
          >
            {stripePortalButtonLabel(state, 'Manage payment & cancellation')}
            {state !== 'loading' && <ExternalLink className="h-4 w-4" aria-hidden />}
          </Button>
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={() => void openPortal()}
            disabled={state === 'loading'}
          >
            View invoices in billing portal →
          </Button>
          <Link href="/pricing" className="inline-flex w-full sm:ml-auto sm:w-auto">
            <Button variant="ghost" size="md" type="button" fullWidth className="sm:w-auto">
              View pricing
            </Button>
          </Link>
        </div>
      </SettingsSectionCard>
    </div>
  )
}

function UsageBar({
  label,
  used,
  cap,
  pct,
  resetDate,
  status = 'normal',
  className = '',
}: {
  label: string
  used: number
  cap: number
  pct: number
  resetDate?: string | null
  status?: 'normal' | 'warning' | 'blocked'
  className?: string
}) {
  const barColor =
    status === 'blocked'
      ? 'var(--ec-error, #f87171)'
      : status === 'warning'
        ? 'var(--ec-warning, #fbbf24)'
        : 'var(--ec-brand)'

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${className}`}
      style={{
        borderColor: 'var(--ec-border)',
        background: 'var(--ec-surface-raised)',
      }}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="label-overline">{label}</p>
        <p className="text-body font-semibold text-[var(--ec-text-primary)]">
          {used} / {cap}
        </p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--ec-border) 80%, transparent)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: barColor,
          }}
        />
      </div>
      {resetDate && <p className="text-caption mt-2">Resets {resetDate}.</p>}
    </div>
  )
}
