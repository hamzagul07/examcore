'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Info } from 'lucide-react'
import { formatMoney } from '@/lib/billing/format'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
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

type TierDef = {
  id: SubscriptionTier
  name: string
  tagline: string
  subtagline?: string
  popular?: boolean
  product: SubscriptionTier | null
}

const TIERS: TierDef[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try any subject — see Examiner\'s Ink and Omni on real work.',
    product: null,
  },
  {
    id: 'student',
    name: 'Student',
    tagline: 'Steady weekly revision across your subjects.',
    product: 'student',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    tagline: 'Regular past-paper practice through the term.',
    popular: true,
    product: 'scholar',
  },
  {
    id: 'mastery',
    name: 'Mastery',
    tagline: 'For exam season',
    subtagline: 'When you\'re working through papers daily and want headroom.',
    product: 'mastery',
  },
]

const FREE_FEATURES = [
  'All 15 Cambridge subjects',
  'Single-question marking',
  "Examiner's Ink overlay",
  'Basic feedback + per-mark reasoning',
  'In-app Omni AI (monthly cap)',
]

const PAID_FEATURES = [
  'Everything in Free',
  'Whole-paper marking',
  'Mastery tracking dashboard',
  'Higher Omni message caps',
  'Priority marking queue',
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
      router.refresh()
    } catch {
      setChangingRegion(false)
    }
  }

  const cur = display.currency

  function priceForTier(tier: SubscriptionTier) {
    if (tier === 'free') return formatMoney(0, cur)
    const block = display[tier][period]
    return formatMoney(block.amountCents, cur)
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--ec-text-secondary)]">
        <span>
          Showing prices in{' '}
          <strong className="text-[var(--ec-text-primary)]">{cur.toUpperCase()}</strong>
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

      <div className="flex justify-center">
        <div className="ec-card inline-flex gap-1 p-1">
          {(['monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                period === p
                  ? 'bg-[color-mix(in_srgb,var(--ec-brand)_20%,transparent)] text-[var(--ec-brand)]'
                  : 'text-[var(--ec-text-secondary)] hover:text-[var(--ec-text-primary)]'
              }`}
            >
              {p === 'monthly' ? 'Monthly' : 'Yearly'}
              {p === 'yearly' && (
                <span className="ml-2 rounded-full bg-[color-mix(in_srgb,var(--ec-brand)_15%,transparent)] px-2 py-0.5 text-[11px] text-[var(--ec-brand)]">
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {founding && (
        <div className="ec-card border-[color-mix(in_srgb,var(--ec-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--ec-brand)_8%,transparent)] px-5 py-3 text-center text-sm">
          <span className="text-[var(--ec-text-primary)]">
            <strong>Founding member:</strong> 50% off any paid plan, locked in forever. Prices
            below already reflect your discount.
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

      <div className="ec-card overflow-hidden">
        <div className="hidden border-b border-[var(--ec-border)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ec-text-secondary)] md:grid md:grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr] md:gap-4">
          <span>Plan</span>
          <span>Price</span>
          <span>Allowance</span>
          <span className="text-right"> </span>
        </div>

        <div className="divide-y divide-[var(--ec-border)]">
          {TIERS.map((tier) => {
            const qCap = capForTier(tier.id)
            const oCap = omniCapForTier(tier.id)
            const isCurrent = currentTier === tier.id
            const periodLabel = period === 'yearly' ? '/ year' : '/ month'

            return (
              <div
                key={tier.id}
                className={`px-5 py-5 md:grid md:grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr] md:items-center md:gap-4 ${
                  tier.popular ? 'bg-[color-mix(in_srgb,var(--ec-brand)_6%,transparent)]' : ''
                }`}
              >
                <div className="min-w-0">
                  {tier.popular && (
                    <p className="mb-1 text-xs font-semibold text-[var(--ec-brand)]">
                      Most students choose this
                    </p>
                  )}
                  <h3 className="text-title text-[var(--ec-text-primary)]">{tier.name}</h3>
                  <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">{tier.tagline}</p>
                  {tier.subtagline && (
                    <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">{tier.subtagline}</p>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1 md:mt-0">
                  <span className="text-2xl font-extrabold tracking-tight text-[var(--ec-text-primary)]">
                    {priceForTier(tier.id)}
                  </span>
                  {tier.id !== 'free' && (
                    <span className="text-sm text-[var(--ec-text-secondary)]">{periodLabel}</span>
                  )}
                </div>

                <div className="mt-2 text-sm text-[var(--ec-text-primary)] md:mt-0">
                  <p>
                    <strong>{qCap}</strong> questions
                  </p>
                  <p className="text-[var(--ec-text-secondary)]">
                    <strong className="text-[var(--ec-text-primary)]">{oCap}</strong> Omni messages
                  </p>
                </div>

                <div className="mt-4 md:mt-0 md:text-right">
                  {tier.product === null ? (
                    !signedIn ? (
                      <Link href="/auth/signup" className="ec-btn-secondary inline-flex w-full justify-center md:w-auto">
                        Get started
                      </Link>
                    ) : isCurrent ? (
                      <span className="inline-block text-sm font-semibold text-[var(--ec-text-secondary)]">
                        Current plan
                      </span>
                    ) : (
                      <Link href="/account" className="ec-btn-secondary inline-flex w-full justify-center md:w-auto">
                        Your account
                      </Link>
                    )
                  ) : isCurrent ? (
                    <button
                      type="button"
                      onClick={openPortal}
                      disabled={busy === 'portal'}
                      className="ec-btn-secondary inline-flex w-full justify-center md:w-auto"
                    >
                      {busy === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => checkout(tier.product!, period)}
                      disabled={busy === tier.product}
                      className="ec-btn-primary inline-flex w-full justify-center md:w-auto"
                    >
                      {busy === tier.product ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Get ${tier.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="ec-card p-6">
          <h3 className="text-title mb-3 text-[var(--ec-text-primary)]">Free includes</h3>
          <ul className="space-y-2 text-sm text-[var(--ec-text-primary)]">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[var(--ec-brand)]">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ec-card p-6">
          <h3 className="text-title mb-3 text-[var(--ec-text-primary)]">Any paid plan adds</h3>
          <ul className="space-y-2 text-sm text-[var(--ec-text-primary)]">
            {PAID_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[var(--ec-brand)]">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div id="credits" className="scroll-mt-24 pt-2">
        <div className="mb-6">
          <h2 className="text-headline text-[var(--ec-text-primary)]">Credit top-ups</h2>
          <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
            Top up anytime. One credit = one question mark or one Omni message. Credits never
            expire.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {([
            ['credits_25', 25, display.credits.credits_25],
            ['credits_100', 100, display.credits.credits_100],
            ['credits_500', 500, display.credits.credits_500],
          ] as const).map(([product, count, price]) => (
            <div key={product} className="ec-card flex flex-col p-5">
              <p className="text-2xl font-extrabold text-[var(--ec-text-primary)]">{count}</p>
              <p className="text-sm text-[var(--ec-text-secondary)]">credits</p>
              <p className="mt-3 text-lg font-bold text-[var(--ec-text-primary)]">
                {formatMoney(price.amountCents, cur)}
              </p>
              <button
                type="button"
                onClick={() => checkout(product)}
                disabled={busy === product}
                className="ec-btn-secondary mt-4 w-full justify-center"
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
