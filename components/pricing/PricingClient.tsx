'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Info, ExternalLink } from 'lucide-react'
import { formatMoney } from '@/lib/billing/format'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { creditsForProduct, type ProductKey } from '@/lib/billing/pricing'
import type { SubscriptionTier } from '@/lib/database.types'
import type { PricingDisplay } from '@/lib/billing/display-prices'
import { SUPPORTED_CURRENCIES } from '@/lib/billing/region-cookie'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { stripePortalButtonLabel, useStripePortal } from '@/lib/hooks/useStripePortal'

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
    tagline: 'Try any subject — Examiner\'s Ink and study chat on real past papers.',
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
  'Cambridge & IB Diploma subjects',
  'Single-question marking',
  "Examiner's Ink overlay",
  'Basic feedback + per-mark reasoning',
  'Ask MarkScheme study chat (monthly cap)',
]

const PAID_FEATURES = [
  'Everything in Free',
  'Whole-paper marking',
  'Mastery tracking dashboard',
  'Higher study chat caps',
  'Priority marking queue',
]

export function PricingClient({ display, signedIn, currentTier, founding, region }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('monthly')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [changingRegion, setChangingRegion] = useState(false)
  const { state: portalState, openPortal } = useStripePortal({
    returnUrl: '/account/billing',
  })

  async function checkout(product: string, billingPeriod?: Period) {
    if (!signedIn) {
      router.push(buildSignUpHref('/pricing'))
      return
    }
    setBusy(product)
    setNotice(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, billing_period: billingPeriod, return_url: '/account/billing' }),
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

  async function changeCurrency(currency: string) {
    setChangingRegion(true)
    try {
      await fetch('/api/billing/region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      router.refresh()
    } catch (err) {
      console.error('PricingClient: failed to change currency', err)
    } finally {
      setChangingRegion(false)
    }
  }

  const cur = display.currency

  function priceForTier(tier: SubscriptionTier) {
    if (tier === 'free') return formatMoney(0, cur)
    const block = display[tier][period]
    return formatMoney(block.amountCents, cur)
  }

  function featuresForTier(
    tier: TierDef,
    qCap: number | string,
    oCap: number | string
  ): string[] {
    if (tier.id === 'free') {
      return [`${qCap} questions / month`, ...FREE_FEATURES]
    }
    return [
      `${qCap} questions / month`,
      `${oCap} study chat messages / month`,
      ...PAID_FEATURES.filter((f) => f !== 'Everything in Free'),
    ]
  }

  return (
    <div className="ms-pricing-client space-y-10 min-w-0 max-w-full overflow-x-clip">
      <div className="ms-pricing-region flex flex-col items-center justify-center gap-3 text-center text-sm text-[var(--ec-text-secondary)] sm:flex-row sm:flex-wrap sm:gap-2">
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

      <div className="ms-lvl-tabs-scroll flex justify-center">
        <div className="ms-lvl-tabs">
          {(['monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`ms-lvl-tab ${period === p ? 'on' : ''}`}
            >
              {p === 'monthly' ? 'Monthly' : 'Yearly'}
              {p === 'yearly' ? ' · save 20%' : ''}
            </button>
          ))}
        </div>
      </div>

      {founding && (
        <div className="ec-panel-highlight px-5 py-3 text-center text-sm">
          <span className="text-[var(--ec-text-primary)]">
            <strong>Founding member:</strong> 50% off any paid plan, locked in forever. Prices
            below already reflect your discount.
          </span>
        </div>
      )}

      {notice && (
        <p className="ec-highlight-warning-panel mx-auto max-w-xl rounded-2xl px-4 py-3 text-center text-sm text-[var(--ec-text-primary)]">
          {notice}
        </p>
      )}

      {!display.configured && (
        <p className="mx-auto max-w-xl text-center text-xs text-[var(--ec-text-secondary)]">
          <Info className="mr-1 inline h-3.5 w-3.5" />
          Prices shown are indicative while subscription setup is being finalized.
        </p>
      )}

      <div className="ms-price-grid">
        {TIERS.map((tier) => {
          const qCap = capForTier(tier.id)
          const oCap = omniCapForTier(tier.id)
          const isCurrent = currentTier === tier.id
          const periodLabel =
            tier.id === 'free'
              ? 'forever'
              : period === 'yearly'
                ? '/ year'
                : '/ month'
          const feats = featuresForTier(tier, qCap, oCap)

          return (
            <div
              key={tier.id}
              className={`ms-price-card${tier.popular ? ' hot' : ''}`}
            >
              {tier.popular ? (
                <span className="ms-hot-badge">most students pick this</span>
              ) : null}
              <span className="ms-overline" style={{ marginBottom: 0 }}>
                {tier.name}
              </span>
              <div className="ms-price-amount">
                {priceForTier(tier.id)}{' '}
                {tier.id !== 'free' ? <small>{periodLabel}</small> : null}
              </div>
              {tier.id === 'free' ? (
                <p className="ms-body-2" style={{ marginTop: 0 }}>
                  {tier.tagline}
                </p>
              ) : (
                <p className="ms-body-2" style={{ marginTop: 0, fontSize: 13.5 }}>
                  {tier.tagline}
                </p>
              )}
              <div className="ms-price-feats">
                {feats.map((f) => (
                  <div key={f}>
                    <span className="tick">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                {tier.product === null ? (
                  !signedIn ? (
                    <Link
                      href={buildSignUpHref('/pricing')}
                      className="ec-btn-primary w-full justify-center"
                    >
                      Start marking
                    </Link>
                  ) : isCurrent ? (
                    <span className="block text-center text-sm font-semibold text-[var(--ec-text-secondary)]">
                      Current plan
                    </span>
                  ) : (
                    <Link
                      href="/account/billing"
                      className="ec-btn-ghost w-full justify-center"
                    >
                      Your account
                    </Link>
                  )
                ) : isCurrent ? (
                  <button
                    type="button"
                    onClick={() => void openPortal()}
                    disabled={portalState === 'loading'}
                    className="ec-btn-ghost w-full justify-center"
                  >
                    {portalState === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Opening...
                      </>
                    ) : (
                      <>
                        {stripePortalButtonLabel(portalState, 'Manage')}
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => checkout(tier.product!, period)}
                    disabled={busy === tier.product}
                    className={
                      tier.popular
                        ? 'ec-btn-primary w-full justify-center'
                        : 'ec-btn-ghost w-full justify-center'
                    }
                  >
                    {busy === tier.product ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Opening checkout...
                      </>
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

      <div id="credits" className="scroll-mt-24 pt-8">
        <div className="mb-6">
          <h2 className="text-headline text-[var(--ec-text-primary)]">Credit top-ups</h2>
          <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
            Top up anytime. One credit = one question mark or one study chat message. Credits never
            expire.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            ['credits_25', 'credits_100', 'credits_500'] as const satisfies readonly ProductKey[]
          ).map((product) => {
            const count = creditsForProduct(product)
            const price = display.credits[product]
            return (
            <div key={product} className="ec-card flex flex-col p-5">
              <p className="ec-stat-figure text-2xl text-[var(--ec-text-primary)]">{count}</p>
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
