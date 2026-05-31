'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Star, Loader2, Info } from 'lucide-react'
import { formatMoney } from '@/lib/billing/format'
import type { SubscriptionTier } from '@/lib/database.types'
import type { PricingDisplay } from '@/lib/billing/display-prices'
import { SUPPORTED_CURRENCIES } from '@/lib/billing/region-cookie'

type Props = {
  display: PricingDisplay
  signedIn: boolean
  currentTier: SubscriptionTier | null
  founding: boolean
  region: { currency: string; country: string | null; override: boolean }
}

type Period = 'monthly' | 'yearly'

const STUDENT_FEATURES = [
  '100 marks / month',
  'All 15 Cambridge subjects',
  'Single questions + whole papers',
  "Examiner's Ink on your handwriting",
  'Syllabus mastery tracking',
  'Omni AI study companion',
  'Credit top-ups anytime',
]
const UNLIMITED_FEATURES = [
  'Unlimited marks',
  'Everything in Student',
  'Priority marking',
  'Early access to new features',
]
const FREE_FEATURES = [
  '5 marks / month',
  '1 subject',
  'Single-question marking',
  'Basic feedback',
]

export function PricingClient({ display, signedIn, currentTier, founding, region }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('monthly')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [changingRegion, setChangingRegion] = useState(false)

  async function checkout(product: string, billingPeriod?: Period) {
    if (!signedIn) {
      router.push(`/auth/signup?next=/pricing`)
      return
    }
    setBusy(product)
    setNotice(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, billing_period: billingPeriod, return_url: '/account' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      if (data?.error === 'pricing_not_configured') {
        setNotice(data.message || 'Subscription setup is in progress — check back soon.')
      } else {
        setNotice(data?.message || data?.error || 'Could not start checkout. Try again.')
      }
    } catch {
      setNotice('Could not start checkout. Try again.')
    }
    setBusy(null)
  }

  async function openPortal() {
    setBusy('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: '/pricing' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
    } catch {
      /* ignore */
    }
    setBusy(null)
  }

  async function changeCurrency(currency: string) {
    setChangingRegion(true)
    try {
      await fetch('/api/billing/region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      router.refresh() // re-render server prices in the new currency (no flash)
    } catch {
      setChangingRegion(false)
    }
  }

  const cur = display.currency
  const studentPrice = display.student[period]
  const unlimitedPrice = display.unlimited[period]

  return (
    <div className="space-y-10">
      {/* Region row */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--ec-text-secondary)]">
        <span>
          Showing prices in <strong className="text-[var(--ec-text-primary)]">{cur.toUpperCase()}</strong>
          {region.country && !region.override ? ` for ${region.country}` : ''}.
        </span>
        <label className="inline-flex items-center gap-2">
          <span className="sr-only">Change currency</span>
          <select
            value={cur}
            disabled={changingRegion}
            onChange={(e) => changeCurrency(e.target.value)}
            className="ec-input select-chevron appearance-none !w-auto !py-1.5 !pr-8 text-sm"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Billing period toggle */}
      <div className="flex justify-center">
        <div className="ec-card inline-flex gap-1 p-1">
          {(['monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                period === p
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-[var(--ec-text-secondary)] hover:text-[var(--ec-text-primary)]'
              }`}
            >
              {p === 'monthly' ? 'Monthly' : 'Yearly'}
              {p === 'yearly' && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {founding && (
        <div className="ec-card flex items-center justify-center gap-2 border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-center text-sm">
          <span aria-hidden>🎉</span>
          <span className="text-[var(--ec-text-primary)]">
            <strong>Founding member:</strong> 50% off any paid plan, locked in forever. Prices below
            already reflect your discount.
          </span>
        </div>
      )}

      {notice && (
        <p className="mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-[var(--ec-text-primary)]">
          {notice}
        </p>
      )}

      {!display.configured && (
        <p className="mx-auto max-w-xl text-center text-xs text-[var(--ec-text-secondary)]">
          <Info className="mr-1 inline h-3.5 w-3.5" />
          Prices shown are indicative while subscription setup is being finalized.
        </p>
      )}

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TierCard
          name="Free"
          tagline="Try it out, no commitment"
          price={formatMoney(0, cur)}
          period=""
          features={FREE_FEATURES}
          cta={
            !signedIn ? (
              <Link href="/auth/signup" className="ec-btn-secondary w-full justify-center">
                Get started
              </Link>
            ) : currentTier === 'free' ? (
              <CurrentPlanBadge />
            ) : (
              <Link href="/account" className="ec-btn-secondary w-full justify-center">
                Your account
              </Link>
            )
          }
        />

        <TierCard
          name="Student"
          tagline="For serious exam prep"
          highlight
          price={formatMoney(studentPrice.amountCents, cur)}
          period={`/ ${period === 'yearly' ? 'year' : 'month'}`}
          features={STUDENT_FEATURES}
          cta={
            currentTier === 'student' ? (
              <ManageButton onClick={openPortal} busy={busy === 'portal'} />
            ) : (
              <button
                type="button"
                onClick={() => checkout('student', period)}
                disabled={busy === 'student'}
                className="ec-btn-primary w-full justify-center"
              >
                {busy === 'student' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Student'}
              </button>
            )
          }
        />

        <TierCard
          name="Unlimited"
          tagline="For exam season grinders"
          price={formatMoney(unlimitedPrice.amountCents, cur)}
          period={`/ ${period === 'yearly' ? 'year' : 'month'}`}
          features={UNLIMITED_FEATURES}
          cta={
            currentTier === 'unlimited' ? (
              <ManageButton onClick={openPortal} busy={busy === 'portal'} />
            ) : (
              <button
                type="button"
                onClick={() => checkout('unlimited', period)}
                disabled={busy === 'unlimited'}
                className="ec-btn-primary w-full justify-center"
              >
                {busy === 'unlimited' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Unlimited'}
              </button>
            )
          }
        />
      </div>

      {/* Credit top-ups */}
      <div id="credits" className="scroll-mt-24 pt-6">
        <div className="mb-6 text-center">
          <h2 className="landing-h3 text-[var(--ec-text-primary)]">Credit top-ups</h2>
          <p className="landing-lead mt-2">
            Top up anytime. 1 credit = 1 mark. Credits never expire.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {([
            ['credits_25', 25, display.credits.credits_25],
            ['credits_100', 100, display.credits.credits_100],
            ['credits_500', 500, display.credits.credits_500],
          ] as const).map(([product, count, price]) => (
            <div key={product} className="ec-card flex flex-col items-center p-6 text-center">
              <p className="text-2xl font-extrabold text-[var(--ec-text-primary)]">{count}</p>
              <p className="mb-3 text-sm text-[var(--ec-text-secondary)]">credits</p>
              <p className="mb-4 text-lg font-bold ec-text-gradient">
                {formatMoney(price.amountCents, cur)}
              </p>
              <button
                type="button"
                onClick={() => checkout(product)}
                disabled={busy === product}
                className="ec-btn-secondary w-full justify-center"
              >
                {busy === product ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Buy ${count} credits`
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TierCard({
  name,
  tagline,
  price,
  period,
  features,
  cta,
  highlight = false,
}: {
  name: string
  tagline: string
  price: string
  period: string
  features: string[]
  cta: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`ec-card relative flex flex-col p-7 ${
        highlight ? 'border-emerald-500/50' : ''
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
          <Star className="h-3 w-3" /> Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold text-[var(--ec-text-primary)]">{name}</h3>
      <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">{tagline}</p>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold ec-text-gradient">{price}</span>
        {period && <span className="text-[var(--ec-text-secondary)]">{period}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--ec-text-primary)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">{cta}</div>
    </div>
  )
}

function CurrentPlanBadge() {
  return (
    <div className="w-full rounded-xl border border-[var(--ec-border)] py-2.5 text-center text-sm font-semibold text-[var(--ec-text-secondary)]">
      Your current plan
    </div>
  )
}

function ManageButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="ec-btn-secondary w-full justify-center">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage'}
    </button>
  )
}
