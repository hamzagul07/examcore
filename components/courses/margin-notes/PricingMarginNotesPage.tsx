'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import {
  GLOSS_VAULT,
  GLOSS_CINEMA,
  GLOSS_SUNDAY_COACH,
} from '@/lib/copy/product-lexicon'
import { InkScribble } from '@/components/courses/margin-notes/HandAnnotations'
import { ExamSheet, ExamSheetLine } from '@/components/margin-notes'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { PricingDisplay, SubscriptionDisplayPrices } from '@/lib/billing/display-prices'
import type { Testimonial } from '@/lib/marketing/testimonials'
import type { RegionChoice } from '@/lib/billing/region-cookie'
import type { SubscriptionTier } from '@/lib/database.types'
import { formatMoney } from '@/lib/billing/format'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { INTERACTIVE_DIAGRAMS_FREE } from '@/lib/billing/features'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { CheckoutSuccessTracker } from '@/components/analytics/CheckoutSuccessTracker'
import { PlanComparisonMatrix } from '@/components/courses/margin-notes/PlanComparisonMatrix'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusMessage } from '@/components/ui/StatusMessage'

type Period = 'monthly' | 'yearly'

function Faq({ f }: { f: { q: string; a: string } }) {
  return (
    <details className="faq">
      <summary className="faq-q">
        <CourseRichText content={f.q} variant="inline" className="faq-q-text" breakAnywhere={false} />
        <span className="faq-plus" aria-hidden>
          +
        </span>
      </summary>
      <div className="faq-a body-2">
        <CourseRichText content={f.a} variant="prose" />
      </div>
    </details>
  )
}

type Props = {
  display: PricingDisplay
  signedIn: boolean
  currentTier: SubscriptionTier | null
  region: RegionChoice
  /** Approved student quotes (two-gate: consent + approval). Empty until supply exists. */
  testimonials?: Testimonial[]
}

/** Sell surface: Free / Scholar / Max. Pro (`student`) is legacy-only. */
type PlanId = 'free' | 'scholar' | 'max'
type PaidPlan = Exclude<PlanId, 'free'>
type PaidProduct = 'scholar' | 'mastery'

const PLAN_PRODUCT: Record<PaidPlan, PaidProduct> = {
  scholar: 'scholar',
  max: 'mastery',
}
const PLAN_NAME: Record<PlanId, string> = { free: 'Free', scholar: 'Scholar', max: 'Max' }
const TIER_RANK: Record<string, number> = { free: 0, student: 1, scholar: 2, mastery: 3 }

const FREE_Q = capForTier('free')
const FREE_OMNI = omniCapForTier('free')
const SCH_Q = capForTier('scholar')
const SCH_OMNI = omniCapForTier('scholar')
const MAX_Q = capForTier('mastery')
const MAX_OMNI = omniCapForTier('mastery')

export function PricingMarginNotesPage({ display, signedIn, currentTier, testimonials }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('yearly')
  const [focusPlan, setFocusPlan] = useState<PlanId>('max')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const cur = display.currency
  const currentRank = TIER_RANK[currentTier ?? 'free'] ?? 0
  const onLegacyPro = currentTier === 'student'

  async function checkout(product: PaidProduct) {
    if (!signedIn) {
      router.push(buildSignUpHref('/pricing'))
      return
    }
    setBusy(product)
    setNotice(null)
    trackFunnelEvent('checkout_started', { source: product })
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

  const scholarPrice = priceBlock(display.scholar)
  const maxPrice = priceBlock(display.mastery)

  function ctaFor(plan: PlanId): {
    label: string
    onClick?: () => void
    href?: string
    variant: 'primary' | 'ghost' | 'muted'
    disabled?: boolean
    loading?: boolean
  } {
    if (plan === 'free') {
      if (!signedIn)
        return { label: 'Create free account', href: buildSignUpHref('/pricing'), variant: 'primary' }
      if (currentRank === 0) return { label: 'Your current plan', variant: 'muted', disabled: true }
      return { label: 'Included', variant: 'muted', disabled: true }
    }

    const product = PLAN_PRODUCT[plan]
    const loading = busy === product

    if (!signedIn) {
      return {
        label: loading ? 'Opening checkout…' : `Choose ${PLAN_NAME[plan]}`,
        href: buildSignUpHref('/pricing'),
        variant: 'primary',
      }
    }

    if (currentTier === product) {
      return { label: 'Your current plan', variant: 'muted', disabled: true }
    }

    const planRank = TIER_RANK[product]
    const verb =
      currentRank === 0
        ? `Choose ${PLAN_NAME[plan]}`
        : planRank > currentRank
          ? `Upgrade to ${PLAN_NAME[plan]}`
          : `Switch to ${PLAN_NAME[plan]}`

    return {
      label: loading ? 'Opening checkout…' : verb,
      onClick: () => void checkout(product),
      variant: 'primary',
      disabled: loading,
      loading,
    }
  }

  const plans: {
    id: PlanId
    name: string
    tag: string
    bestFor: string
    blurb: string
    killer: string
    now: string
    per: string
    sub: string | null
    featured?: boolean
    features: [string, boolean][]
  }[] = [
    {
      id: 'free',
      name: 'Free',
      tag: 'Taste the ink',
      bestFor: 'Feeling the marker before you commit',
      blurb:
        'A few scripts a month with the real stamps — green, crimson, scheme codes in your margins. Enough to know this is not another chatbot.',
      killer: `${FREE_Q} stamped questions / month · keep every script forever`,
      now: formatMoney(0, cur),
      per: 'forever',
      sub: null,
      features: [
        ['All lessons, notes & worked examples', true],
        ["Edexcel, OxfordAQA, AQA & AP study paths — marked in your board's own codes", true],
        [`${FREE_Q} marked questions / month`, true],
        [`${FREE_OMNI} study-chat messages / month`, true],
        [
          INTERACTIVE_DIAGRAMS_FREE
            ? 'Live interactive diagrams — free while in beta'
            : 'Live interactive diagrams',
          INTERACTIVE_DIAGRAMS_FREE,
        ],
        ['Whole-paper marking', false],
        ['Max Resource Vault & weekly coach', false],
      ],
    },
    {
      id: 'scholar',
      name: 'Scholar',
      tag: 'Serious weekly pace',
      bestFor: 'Courses, whole papers, mastery map',
      blurb:
        'When free feels too small: whole papers, examiner-depth feedback, visual courses, and a journey that shows exactly which topics still bleed marks.',
      killer: `${SCH_Q} questions · mastery matrix · grade journey`,
      now: scholarPrice.now,
      per: scholarPrice.per,
      sub: scholarPrice.sub,
      features: [
        ['Everything in Free', true],
        [`${SCH_Q} marked questions / month`, true],
        [`${SCH_OMNI} study-chat messages / month`, true],
        ['Whole-paper marking — up to 15 questions', true],
        ['Past-paper practice, flashcards & quizzes', true],
        ['In-depth courses + mapped board study paths', true],
        ['Examiner-style detailed marking feedback', true],
        ['Topic mastery matrix & progress journey', true],
        ['Max Resource Vault & weekly coach', false],
      ],
    },
    {
      id: 'max',
      name: 'Max',
      // Was "Most popular" — a claim the subscriber numbers do not back yet.
      // Reinstate the day the data does.
      tag: 'The full coach',
      bestFor: 'Marking plus the coach built from it',
      blurb: `The coach on top of the marking. The Vault — ${GLOSS_VAULT}. Concept Cinema — ${GLOSS_CINEMA}. A sprint pack near the exam, priority marking on long papers, and the Sunday coach — ${GLOSS_SUNDAY_COACH}.`,
      killer: `${MAX_Q} questions · Vault · Cinema · Sunday coach`,
      now: maxPrice.now,
      per: maxPrice.per,
      sub: maxPrice.sub,
      featured: true,
      features: [
        ['Everything in Scholar', true],
        [`${MAX_Q} marked questions / month`, true],
        [`${MAX_OMNI} study-chat messages / month`, true],
        ['Resource Vault — a desk per subject, with Concept Cinema', true],
        ['Personalised sprint pack near your exam', true],
        ['Priority deep marking on big scripts', true],
        ['Weekly Max coach report (Sundays)', true],
        ['Projected grade + gap-to-target', true],
        ['Welcome bonus +25 marks', true],
        ['Early access when new features ship', true],
      ],
    },
  ]

  const valueProps = [
    {
      stamp: 'MS',
      title: 'The scheme, not a vibe',
      body: 'B1 · M1 · A1 on the exact paper — stamps that feel like an examiner stood over your desk, not a soft “good effort.”',
    },
    {
      stamp: 'MX',
      title: 'Every miss becomes the plan',
      body: "Each leak updates a Vault desk, queues a Cinema replay, shapes the sprint pack, and shows up in Sunday's report — revision that pulls you back because it finally has a target.",
    },
    {
      stamp: 'Q·P',
      title: 'Whole papers in one breath',
      body: 'Drop the full script. Up to fifteen questions come back stamped — the hall rhythm, not one lonely question.',
    },
    {
      stamp: '✎',
      title: 'Ask someone who remembers you',
      body: 'Study chat that knows your subjects, your attempts, your syllabus — not a stranger homework bot.',
    },
  ]

  const maxReasons = [
    {
      stamp: '01',
      title: 'The stamp becomes a desk',
      body: 'You mark. Max maps the bleed. Overnight your Vault is a subject desk built from your weakest topics — living, not a bookmark list you forget.',
    },
    {
      stamp: '02',
      title: 'Cinema until it clicks',
      body: 'Watch demand shift, a derivative fall, a market clear — scrub the beat, then mark again with priority depth when the paper stretches long.',
    },
    {
      stamp: '03',
      title: 'Sunday won\'t let you drift',
      body: 'A coach report with drills, +25 welcome marks, and a sprint pack when the exam is inside two weeks. The season stops feeling endless.',
    },
  ]

  const faqs = [
    {
      q: 'Which plan should I pick?',
      a: `Free if you want the first stamp to hit — ${FREE_Q} questions, no card. Scholar when you are sitting whole papers and want courses plus a mastery map (${SCH_Q} questions). Max when you want the loop that pulls you back: Vault, Cinema, priority marking, Sunday coach, sprint near the exam, and ${MAX_Q} questions so May never runs dry.`,
    },
    {
      q: 'What do I actually get with Max?',
      a: 'Not “Scholar plus more stamps.” A private exam machine: a Vault that rebuilds from your marks, Cinema beside the path, sprint packs from real past-paper rows, priority deep marking, a Sunday coach with drills, grade-to-target, and +25 welcome marks. That is the craving — and the reason Max exists.',
    },
    {
      q: 'Can I try it without paying?',
      a: `Yes. Creating an account puts you on the free plan — ${FREE_Q} marked questions and ${FREE_OMNI} study-chat messages every month, against the real mark scheme, with no card and no time limit. It is not a trial that expires; it is simply the free plan. Everything you mark stays saved and readable whether or not you ever subscribe.`,
    },
    {
      q: 'What makes the marking different from ChatGPT?',
      a: 'We mark in the dialect of your board — Cambridge, IB, or Edexcel IAL — for that past-paper style question: B1/M1/A1 method marks, MCQ keys, essay bands. You get point-by-point feedback on your handwriting with Examiner\'s Ink, not a generic "good effort" paragraph.',
    },
    {
      q: 'Do you have Edexcel, OxfordAQA, AQA, or AP courses?',
      a: 'Native lesson JSON is Cambridge and IB. For Edexcel IAL, OxfordAQA IAL, UK AQA Maths/Physics, and AP Calculus AB / Physics 1 we give free study paths: our own visual CAIE lessons tagged to your board, then marking in that board\'s own codes (FRQ guidelines for AP). You are not buying a scraped third-party course — you are buying marking that speaks your board\'s language.',
    },
    {
      q: "What happens when I use up the free 5 marks?",
      a: "Marking pauses until your month resets — nothing is deleted, and every marked answer stays on your desk. Upgrade mid-month and marking resumes immediately on the plan's allowance.",
    },
    {
      q: "I'm a student — can a parent pay?",
      a: "Yes, and most do: hand them this page. Checkout is a normal card payment through our billing partner, they don't need an account of their own, and every mark comes with a score slip made for sharing home.",
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel in a couple of clicks from your account and you keep access until the end of the period you\'ve paid for. No lock-in, no cancellation fees.',
    },
  ]

  return (
    <main className="pricing-page ec-page-mesh" data-screen-label="Pricing">
      <Suspense fallback={null}>
        <CheckoutSuccessTracker />
      </Suspense>
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Pricing' }]} />

        <header className="pricing-hero pricing-hero--artefact">
          <div className="pricing-hero-copy">
            <p className="overline">Pricing · ink first, decide later</p>
            <h1 className="h-display pricing-title">
              Once you see the leak, you will want the <em>machine.</em>
            </h1>
            {/* The headline keeps the voice; the lead is where a parent decides,
                so every named feature carries its plain gloss (product-lexicon).
                This paragraph previously read "Max is the craving — Vault desks
                that rebuild, Cinema that moves the idea… until the hall": four
                product names, zero definitions, on the page where the card
                number gets typed. */}
            <p className="lead pricing-lead">
              Free lets the ink land. Scholar adds whole papers, examiner-depth
              feedback and a mastery map of exactly where marks leak.{' '}
              <InkScribble>Max</InkScribble> adds the coach: the Vault —{' '}
              {GLOSS_VAULT} — Concept Cinema ({GLOSS_CINEMA}), priority marking
              on long papers, and the Sunday coach, {GLOSS_SUNDAY_COACH}.
            </p>
            {/* Every plan below is priced on features a visitor has never seen,
                because the paid half is computed from a marking history they do
                not have yet. This is the only page where they can look at one. */}
            <Link href="/demo" className="pricing-see-demo">
              See a full account before you pick →
            </Link>
          </div>
          <div className="pricing-hero-sheet" aria-hidden>
            <ExamSheet
              head="Your script · sample"
              headRight="Max record"
              tally="4 / 5"
              cite="Every stamp updates the Vault — the miss becomes the plan"
            >
              <ExamSheetLine work="method clear — chain rule" mark="M1 ✓" ok stampDelayMs={120} />
              <ExamSheetLine work="both stationary points" mark="A1 ✓" ok stampDelayMs={320} />
              <ExamSheetLine
                work="nature: min at x = 1"
                mark="A0 ✗"
                ok={false}
                note="Cinema beat → second derivative"
                stampDelayMs={520}
              />
            </ExamSheet>
          </div>
        </header>

        {onLegacyPro ? (
          <StatusMessage tone="info" className="pricing-notice">
            You are on Pro (no longer offered to new subscribers). Upgrade to Scholar or Max
            anytime — or manage billing in your account.
          </StatusMessage>
        ) : null}

        <div className="pricing-controls">
          <p className="pricing-allowance-lead">
            How many answers do you mark each month?{' '}
            <span className="mono">
              Free {FREE_Q} · Scholar {SCH_Q} · Max {MAX_Q}
            </span>
          </p>
          <SegmentedControl
            className="pricing-toggle"
            optionClassName="pricing-toggle-btn"
            aria-label="Billing period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Annual' },
            ]}
          />
        </div>

        {notice ? (
          <StatusMessage tone="alert" className="pricing-notice">
            {notice}
          </StatusMessage>
        ) : null}

        <SegmentedControl
          className="pricing-plan-picker"
          optionClassName="pricing-plan-picker-btn"
          aria-label="Choose a plan to compare"
          value={focusPlan}
          onChange={setFocusPlan}
          options={plans.map((p) => ({ value: p.id, label: p.name }))}
        />

        <div className="plans three" id="plans">
          {plans.map((p) => {
            const cta = ctaFor(p.id)
            return (
              <div
                key={p.id}
                className={`plan card${p.featured ? ' featured pricing-card--featured pricing-card-mesh' : ''}`}
                data-plan={p.id}
                data-focus={focusPlan === p.id ? '1' : '0'}
                data-screen-label={`Pricing — ${p.name}`}
              >
                <p className="plan-tag mono">
                  {/* Ribbon said MOST POPULAR — an unbacked popularity claim at
                      the current subscriber count. Reinstate when the data says
                      so; until then the ribbon states what the plan IS. */}
                  {p.featured ? (
                    <span className="plan-ribbon mono">EVERYTHING INCLUDED</span>
                  ) : null}
                  {p.tag}
                </p>
                <h3 className="plan-name serif">{p.name}</h3>
                <div className="plan-price">
                  <span className="plan-now serif">{p.now}</span>
                  <span className="plan-per">{p.per}</span>
                </div>
                <p className="plan-eq">{p.sub ?? '\u00a0'}</p>
                <p className="body-2 plan-blurb">{p.blurb}</p>
                <p className="plan-bestfor mono">Best for: {p.bestFor}</p>
                <div className="plan-killer">
                  <span className="plan-killer-stamp" aria-hidden>
                    ✓
                  </span>
                  <span>{p.killer}</span>
                </div>
                {cta.href ? (
                  <LoadingLink
                    className={`plan-cta btn-${cta.variant === 'primary' ? 'primary' : 'ghost'}${cta.variant === 'muted' ? ' is-muted' : ''}`}
                    href={cta.href}
                    loadingText={cta.label}
                  >
                    {cta.label}
                  </LoadingLink>
                ) : (
                  <button
                    type="button"
                    className={`plan-cta btn-${cta.variant === 'primary' ? 'primary' : 'ghost'}${cta.variant === 'muted' ? ' is-muted' : ''}${cta.loading ? ' ec-btn-loading-wrap ec-btn-shimmer' : ''}`}
                    onClick={cta.onClick}
                    disabled={cta.disabled}
                    aria-busy={cta.loading || undefined}
                    data-loading={cta.loading ? 'true' : undefined}
                  >
                    {cta.loading ? (
                      <ButtonLoadingState mode="shimmer" loadingText={cta.label}>
                        {cta.label}
                      </ButtonLoadingState>
                    ) : (
                      cta.label
                    )}
                  </button>
                )}
                <ul className="plan-feats">
                  {p.features.map((f, i) => (
                    <li key={i} className={f[1] ? 'yes' : 'no'}>
                      <span className="feat-mark" aria-hidden>
                        {f[1] ? '✓' : '—'}
                      </span>
                      <span>{f[0]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="pricing-trust">
          <span className="pricing-trust-item">
            <span className="pricing-trust-tick" aria-hidden>
              ✓
            </span>
            Cancel anytime — no lock-in
          </span>
          <span className="pricing-trust-item">
            <span className="pricing-trust-tick" aria-hidden>
              ✓
            </span>
            15 Cambridge subjects + IB Diploma
          </span>
          <span className="pricing-trust-item">
            <span className="pricing-trust-tick" aria-hidden>
              ✓
            </span>
            Marked against official schemes
          </span>
          <span className="pricing-trust-item">
            <span className="pricing-trust-tick" aria-hidden>
              ✓
            </span>
            Billed in {cur.toUpperCase()} · local currency at checkout
          </span>
        </div>

        <div className="pricing-value-strip" role="list" aria-label="Key benefits">
          {valueProps.map((v) => (
            <div key={v.title} className="pricing-value-item pricing-value-item--slip" role="listitem">
              <span className="pricing-value-stamp" aria-hidden>
                {v.stamp}
              </span>
              <div>
                <p className="pricing-value-title">{v.title}</p>
                <p className="pricing-value-body">{v.body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="pricing-why" aria-labelledby="pricing-why-heading">
          <p className="overline pricing-why-kicker">Why Max feels unfair</p>
          <h2 id="pricing-why-heading" className="h3 section-title pricing-why-title">
            Other plans mark you. Max <em>pulls you back.</em>
          </h2>
          <p className="lead pricing-why-lead">
            Scholar is honest exam prep. Max is the loop students stay in — because every
            stamp opens a desk, a moving idea, and a next paper that already knows your weak
            spot.
          </p>
          <div className="pricing-why-grid">
            {maxReasons.map((r) => (
              <div key={r.title} className="pricing-why-card pricing-why-card--paper">
                <span className="pricing-value-stamp" aria-hidden>
                  {r.stamp}
                </span>
                <h3 className="pricing-why-card-title">{r.title}</h3>
                <p className="body-2 pricing-why-card-body">{r.body}</p>
              </div>
            ))}
          </div>
          <div className="pricing-why-cta">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const cta = ctaFor('max')
                if (cta.href) router.push(cta.href)
                else if (cta.onClick) cta.onClick()
              }}
              disabled={ctaFor('max').disabled}
            >
              {ctaFor('max').label} <span className="h-4 w-4" aria-hidden>-&gt;</span>
            </button>
          </div>
        </section>

        <details className="pricing-matrix-disclosure">
          <summary className="pricing-matrix-summary">
            Compare every feature across Free, Scholar, and Max
          </summary>
          <div className="pricing-matrix-body">
            <PlanComparisonMatrix nested />
          </div>
        </details>

        {/* Student quotes where money decides. Supply-gated: renders nothing
            until feedback quotes are approved — an empty "loved by students"
            shell would cost more trust than silence. */}
        {testimonials?.length ? (
          <section className="pricing-why" aria-label="What students say">
            <h2 className="h3 section-title">Left by students, after their own mark</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border-2 border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
                  <blockquote className="text-sm leading-relaxed text-[var(--ec-text-primary)]">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-2 text-xs text-[var(--ec-text-secondary)]">— {t.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <div className="pricing-faqs">
          <h2 className="h3 section-title">Honest answers</h2>
          {faqs.map((f, i) => (
            <Faq key={i} f={f} />
          ))}
        </div>

        <p className="micro pricing-footnote">
          FREE PLAN FOREVER · NO CARD TO START · CANCEL ANY TIME ·
          NOT ENDORSED BY CAMBRIDGE, PEARSON, OR THE IB
        </p>

        <PageHelpStrip className="mt-10" />
      </div>
    </main>
  )
}
