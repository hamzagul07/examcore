'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { InkScribble } from '@/components/courses/margin-notes/HandAnnotations'
import { CourseRichText } from '@/components/courses/CourseRichText'
import type { PricingDisplay, SubscriptionDisplayPrices } from '@/lib/billing/display-prices'
import type { EffectiveAccess } from '@/lib/billing/access'
import type { RegionChoice } from '@/lib/billing/region-cookie'
import { SUPPORTED_CURRENCIES } from '@/lib/billing/region-cookie'
import { formatMoney } from '@/lib/billing/format'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { buildSignUpHref } from '@/lib/auth-redirect'

type Period = 'monthly' | 'yearly'

function Faq({ f }: { f: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq${open ? ' on' : ''}`}>
      <button type="button" className="faq-q" onClick={() => setOpen((o) => !o)}>
        <CourseRichText content={f.q} variant="inline" className="faq-q-text" breakAnywhere={false} />
        <span className="faq-plus">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="faq-a body-2">
          <CourseRichText content={f.a} variant="prose" />
        </div>
      ) : null}
    </div>
  )
}

type Props = {
  display: PricingDisplay
  signedIn: boolean
  access: EffectiveAccess
  region: RegionChoice
}

type PlanId = 'free' | 'pro' | 'max'

const FREE_Q = capForTier('free')
const FREE_OMNI = omniCapForTier('free')
const PRO_Q = capForTier('scholar')
const PRO_OMNI = omniCapForTier('scholar')
const MAX_Q = capForTier('mastery')
const MAX_OMNI = omniCapForTier('mastery')

export function PricingMarginNotesPage({ display, signedIn, access, region }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('yearly')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)
  const cur = display.currency

  async function checkout(product: 'scholar' | 'mastery') {
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
        body: JSON.stringify({
          product,
          billing_period: period,
          return_url: '/account/billing',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      setNotice(
        data?.message ||
          data?.error ||
          'Could not start checkout. Try again in a moment.'
      )
    } catch {
      setNotice('Could not start checkout. Try again in a moment.')
    }
    setBusy(null)
  }

  async function changeCurrency(currency: string) {
    setSwitching(true)
    try {
      await fetch('/api/billing/region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      router.refresh()
    } catch (err) {
      console.error('PricingMarginNotesPage: failed to change currency', err)
    } finally {
      setSwitching(false)
    }
  }

  function priceBlock(prices: SubscriptionDisplayPrices) {
    const monthly = prices.monthly.amountCents
    const yearly = prices.yearly.amountCents
    if (period === 'monthly') {
      return { now: formatMoney(monthly, cur), per: '/ month', sub: null as string | null }
    }
    const monthlyEq = Math.round(yearly / 12)
    const savePct =
      monthly > 0 ? Math.round((1 - yearly / (monthly * 12)) * 100) : 0
    return {
      now: formatMoney(monthlyEq, cur),
      per: '/ month',
      sub: `${formatMoney(yearly, cur)} billed yearly · save ${savePct}%`,
    }
  }

  const proPrice = priceBlock(display.scholar)
  const maxPrice = priceBlock(display.mastery)

  // CTA wiring per plan, based on the viewer's current effective access.
  function ctaFor(plan: PlanId): {
    label: string
    onClick?: () => void
    href?: string
    variant: 'primary' | 'ghost' | 'muted'
    disabled?: boolean
  } {
    if (plan === 'free') {
      if (!signedIn)
        return { label: 'Start 7-day free trial', href: buildSignUpHref('/pricing'), variant: 'ghost' }
      if (access === 'free') return { label: 'Your current plan', variant: 'muted', disabled: true }
      return { label: 'Included', variant: 'muted', disabled: true }
    }

    const product = plan === 'pro' ? 'scholar' : 'mastery'
    const loading = busy === product
    const verb = loading ? 'Opening checkout…' : null

    if (!signedIn) {
      return {
        label: verb ?? `Start free trial → ${plan === 'pro' ? 'Pro' : 'Max'}`,
        href: buildSignUpHref('/pricing'),
        variant: plan === 'pro' ? 'primary' : 'ghost',
      }
    }
    if (plan === 'pro') {
      if (access === 'pro') return { label: 'Your current plan', variant: 'muted', disabled: true }
      if (access === 'max') return { label: 'Included in Max', variant: 'muted', disabled: true }
      return {
        label: verb ?? (access === 'trial' ? 'Continue with Pro' : 'Choose Pro'),
        onClick: () => void checkout('scholar'),
        variant: 'primary',
        disabled: loading,
      }
    }
    // plan === 'max'
    if (access === 'max') return { label: 'Your current plan', variant: 'muted', disabled: true }
    return {
      label: verb ?? (access === 'pro' ? 'Upgrade to Max' : 'Choose Max'),
      onClick: () => void checkout('mastery'),
      variant: 'ghost',
      disabled: loading,
    }
  }

  const plans: {
    id: PlanId
    name: string
    tag: string
    blurb: string
    now: string
    per: string
    sub: string | null
    featured?: boolean
    features: [string, boolean][]
  }[] = [
    {
      id: 'free',
      name: 'Free',
      tag: 'No card required',
      blurb: 'Read every lesson — notes, formulas and worked examples — forever.',
      now: formatMoney(0, cur),
      per: 'forever',
      sub: null,
      features: [
        ['Notes, formulas & worked examples', true],
        [`Mark ${FREE_Q} questions / month`, true],
        [`${FREE_OMNI} study-chat messages / month`, true],
        ['Live interactive diagrams', false],
        ['Past-paper practice & flashcards', false],
        ['Projected grades', false],
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      tag: 'Most popular',
      blurb: 'Everything you need through the term — diagrams, practice and real marking.',
      now: proPrice.now,
      per: proPrice.per,
      sub: proPrice.sub,
      featured: true,
      features: [
        ['Everything in Free', true],
        ['Live interactive diagrams', true],
        ['Past-paper practice, flashcards & quizzes', true],
        [`Mark ${PRO_Q} questions / month`, true],
        [`${PRO_OMNI} study-chat messages / month`, true],
        ['Whole-paper marking', true],
      ],
    },
    {
      id: 'max',
      name: 'Max',
      tag: 'For exam season',
      blurb: 'Maximum headroom when you’re working through papers every day.',
      now: maxPrice.now,
      per: maxPrice.per,
      sub: maxPrice.sub,
      features: [
        ['Everything in Pro', true],
        [`Mark ${MAX_Q} questions / month`, true],
        [`${MAX_OMNI} study-chat messages / month`, true],
        ['Projected grade estimates', true],
        ['Priority marking queue', true],
      ],
    },
  ]

  const faqs = [
    {
      q: 'How does the free trial work?',
      a: `Every new account gets 7 days of full access — live diagrams, past-paper practice and higher marking limits — with no card required. When it ends you keep the free plan automatically; nothing is charged unless you choose to upgrade.`,
    },
    {
      q: 'What’s included on the free plan?',
      a: `Free gives you every lesson — notes, formulas, simple explanations and worked examples — across all fifteen Cambridge subjects, plus ${FREE_Q} marked questions and ${FREE_OMNI} study-chat messages each month. Live diagrams, practice questions and flashcards are part of Pro and Max.`,
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel in a couple of clicks from your account and you keep access until the end of the period you’ve paid for. No lock-in, no cancellation fees.',
    },
    {
      q: 'Is the marking really the official scheme?',
      a: 'We mark against the real Cambridge mark scheme for that exact question — B1/M1/A1, MCQ keys, essay bands — not a generic AI guess.',
    },
  ]

  return (
    <main className="pricing-page" data-screen-label="Pricing">
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Pricing' }]} />
        <header className="pricing-hero">
          <p className="overline">Pricing · honest &amp; student-first</p>
          <h1 className="h-display pricing-title">
            Try everything <em>free</em> for 7 days.
          </h1>
          <p className="lead pricing-lead">
            Full access to live diagrams, past-paper practice and real marking —{' '}
            <InkScribble>no card required</InkScribble>. Keep the free plan forever
            after, or upgrade only if it’s worth it.
          </p>
        </header>

        {access === 'trial' ? (
          <div className="pricing-trialbar" role="status">
            <span className="pricing-trialbar-tag mono">TRIAL</span>
            <span>
              You’re on your free trial with full access. Pick a plan below to keep
              diagrams, practice &amp; marking when it ends.
            </span>
          </div>
        ) : null}

        <div className="pricing-controls">
          <div className="pricing-toggle" role="tablist" aria-label="Billing period">
            {(['monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`pricing-toggle-btn${period === p ? ' on' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'monthly' ? 'Monthly' : 'Annual'}
                {p === 'yearly' ? <span className="pricing-toggle-save">save 33%</span> : null}
              </button>
            ))}
          </div>
          <label className="pricing-currency">
            <span className="sr-only">Currency</span>
            <select
              value={cur}
              disabled={switching}
              onChange={(e) => changeCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {notice ? <p className="pricing-notice">{notice}</p> : null}

        <div className="plans three">
          {plans.map((p) => {
            const cta = ctaFor(p.id)
            return (
              <div
                key={p.id}
                className={`plan card${p.featured ? ' featured' : ''}`}
                data-screen-label={`Pricing — ${p.name}`}
              >
                {p.featured ? <span className="plan-ribbon mono">MOST POPULAR</span> : null}
                <p className="plan-tag mono">{p.tag}</p>
                <h3 className="plan-name serif">{p.name}</h3>
                <div className="plan-price">
                  <span className="plan-now serif">{p.now}</span>
                  <span className="plan-per">{p.per}</span>
                </div>
                <p className="plan-eq">{p.sub ?? ' '}</p>
                <p className="body-2 plan-blurb">{p.blurb}</p>
                {cta.href ? (
                  <Link
                    className={`plan-cta btn-${cta.variant === 'primary' ? 'primary' : 'ghost'}${cta.variant === 'muted' ? ' is-muted' : ''}`}
                    href={cta.href}
                  >
                    {cta.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`plan-cta btn-${cta.variant === 'primary' ? 'primary' : 'ghost'}${cta.variant === 'muted' ? ' is-muted' : ''}`}
                    onClick={cta.onClick}
                    disabled={cta.disabled}
                  >
                    {cta.label}
                  </button>
                )}
                <ul className="plan-feats">
                  {p.features.map((f, i) => (
                    <li key={i} className={f[1] ? 'yes' : 'no'}>
                      <span className="feat-mark">{f[1] ? '✓' : '—'}</span>
                      <span>{f[0]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="pricing-trust">
          <span className="pricing-trust-item">✓ Cancel anytime — no lock-in</span>
          <span className="pricing-trust-item">✓ 15 Cambridge subjects, AS &amp; A Level</span>
          <span className="pricing-trust-item">✓ Marked against official schemes</span>
          <span className="pricing-trust-item">
            ✓ Prices in {cur.toUpperCase()}
            {region.country && !region.override ? ` for ${region.country}` : ''}
          </span>
        </div>

        <div className="pricing-faqs">
          <h2 className="h3 section-title">Honest answers</h2>
          {faqs.map((f, i) => (
            <Faq key={i} f={f} />
          ))}
        </div>

        <p className="micro pricing-footnote">
          7-DAY FREE TRIAL · NO CARD · FREE PLAN FOREVER · NOT ENDORSED BY CAMBRIDGE
          INTERNATIONAL
        </p>
      </div>
    </main>
  )
}
