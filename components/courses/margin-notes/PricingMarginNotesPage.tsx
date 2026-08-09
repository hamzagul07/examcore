'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { InkScribble } from '@/components/courses/margin-notes/HandAnnotations'
import { ExamSheet, ExamSheetLine } from '@/components/margin-notes'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { PricingDisplay, SubscriptionDisplayPrices } from '@/lib/billing/display-prices'
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
}

type PlanId = 'free' | 'pro' | 'scholar' | 'max'
type PaidPlan = Exclude<PlanId, 'free'>
type PaidProduct = 'student' | 'scholar' | 'mastery'

const PLAN_PRODUCT: Record<PaidPlan, PaidProduct> = {
  pro: 'student',
  scholar: 'scholar',
  max: 'mastery',
}
const PLAN_NAME: Record<PlanId, string> = { free: 'Free', pro: 'Pro', scholar: 'Scholar', max: 'Max' }
const TIER_RANK: Record<string, number> = { free: 0, student: 1, scholar: 2, mastery: 3 }

const FREE_Q = capForTier('free')
const FREE_OMNI = omniCapForTier('free')
const PRO_Q = capForTier('student')
const PRO_OMNI = omniCapForTier('student')
const SCH_Q = capForTier('scholar')
const SCH_OMNI = omniCapForTier('scholar')
const MAX_Q = capForTier('mastery')
const MAX_OMNI = omniCapForTier('mastery')

export function PricingMarginNotesPage({ display, signedIn, currentTier }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('yearly')
  const [focusPlan, setFocusPlan] = useState<PlanId>('scholar')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const cur = display.currency
  const currentRank = TIER_RANK[currentTier ?? 'free'] ?? 0

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

  const proPrice = priceBlock(display.student)
  const scholarPrice = priceBlock(display.scholar)
  const maxPrice = priceBlock(display.mastery)

  // CTA wiring per plan, based on the viewer's current subscription tier.
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
        return { label: 'Create free account', href: buildSignUpHref('/pricing'), variant: 'ghost' }
      if (currentRank === 0) return { label: 'Your current plan', variant: 'muted', disabled: true }
      return { label: 'Included', variant: 'muted', disabled: true }
    }

    const product = PLAN_PRODUCT[plan]
    const loading = busy === product
    const featured = plan === 'scholar'

    if (!signedIn) {
      return {
        label: loading ? 'Opening checkout…' : `Choose ${PLAN_NAME[plan]}`,
        href: buildSignUpHref('/pricing'),
        variant: featured ? 'primary' : 'ghost',
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
      variant: featured ? 'primary' : 'ghost',
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
      tag: 'No card required',
      bestFor: 'Browsing courses & trying marking',
      blurb:
        'Mapped visual lessons (Cambridge, IB, Edexcel study paths) plus enough marking to see if the dialect clicks.',
      killer: `${FREE_Q} marked questions every month — no card, no expiry`,
      now: formatMoney(0, cur),
      per: 'forever',
      sub: null,
      features: [
        ['All lessons, notes & worked examples', true],
        ['Edexcel & OxfordAQA study paths → board-dialect mark', true],
        [`${FREE_Q} marked questions / month`, true],
        [`${FREE_OMNI} study-chat messages / month`, true],
        [
          INTERACTIVE_DIAGRAMS_FREE
            ? 'Live interactive diagrams — free while in beta'
            : 'Live interactive diagrams',
          INTERACTIVE_DIAGRAMS_FREE,
        ],
        ['Whole-paper marking', false],
        ['Past-paper practice & flashcards', false],
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      tag: 'Start marking seriously',
      bestFor: 'One subject, regular practice',
      blurb:
        'Real examiner-style marking — Cambridge, IB, Edexcel IAL, and OxfordAQA — plus whole papers and flashcards for weekly practice.',
      killer: `${PRO_Q} questions / month — 10× the free tier`,
      now: proPrice.now,
      per: proPrice.per,
      sub: proPrice.sub,
      features: [
        ['Everything in Free', true],
        [`${PRO_Q} marked questions / month`, true],
        [`${PRO_OMNI} study-chat messages / month`, true],
        ['Whole-paper marking — up to 15 questions', true],
        ['Past-paper practice, flashcards & quizzes', true],
        ['Live interactive diagrams', true],
        ['In-depth courses & progress journey', false],
      ],
    },
    {
      id: 'scholar',
      name: 'Scholar',
      tag: 'Most popular',
      bestFor: 'Full exam prep across subjects',
      blurb:
        'Courses that teach + marking that converts — visual lessons, Pearson/Cambridge/IB dialect feedback, mastery tracking.',
      killer: `${SCH_Q} questions + mastery matrix & grade journey`,
      now: scholarPrice.now,
      per: scholarPrice.per,
      sub: scholarPrice.sub,
      featured: true,
      features: [
        ['Everything in Pro', true],
        [`${SCH_Q} marked questions / month`, true],
        [`${SCH_OMNI} study-chat messages / month`, true],
        ['In-depth courses + Edexcel mapped study paths', true],
        ['Examiner-style detailed marking feedback', true],
        ['Topic mastery matrix & progress journey', true],
        ['Extra revision resources & practice packs', true],
      ],
    },
    {
      id: 'max',
      name: 'Max',
      tag: 'Exam season',
      bestFor: 'Daily paper marking before exams',
      blurb: 'Maximum marking headroom when you\'re sitting papers every day — plus projected grades and priority queue.',
      killer: `${MAX_Q} questions / month + projected grades`,
      now: maxPrice.now,
      per: maxPrice.per,
      sub: maxPrice.sub,
      features: [
        ['Everything in Scholar', true],
        [`${MAX_Q} marked questions / month`, true],
        [`${MAX_OMNI} study-chat messages / month`, true],
        ['Projected grade estimates', true],
        ['Priority marking queue', true],
        ['Early access to new features', true],
      ],
    },
  ]

  const valueProps = [
    {
      stamp: 'MS',
      title: 'Official mark schemes',
      body: 'B1, M1, A1 — marked against the real Cambridge or IB scheme for that exact question, not a generic AI guess.',
    },
    {
      stamp: 'Q·P',
      title: 'Whole-paper marking',
      body: 'Upload a full past paper and get every question marked in one go — up to 15 questions per paper on paid plans.',
    },
    {
      stamp: 'Δ',
      title: 'Progress that matters',
      body: 'Topic mastery matrix, grade trajectory, and weak-spot radar — see exactly where marks are being lost.',
    },
    {
      stamp: '✎',
      title: 'Ask MarkScheme',
      body: 'Study chat that knows your subjects, your attempts, and the syllabus — not a generic homework bot.',
    },
  ]

  const scholarReasons = [
    {
      stamp: '¶',
      title: 'Courses that teach the syllabus',
      body: 'Interactive lessons with diagrams, worked examples, and topic-by-topic coverage — not just marking.',
    },
    {
      stamp: 'M1',
      title: 'Feedback an examiner would write',
      body: 'Detailed mark-by-mark breakdowns with margin notes on your handwriting — the same style as our landing demo.',
    },
    {
      stamp: 'A*',
      title: 'Know your weak topics',
      body: 'Mastery matrix maps every syllabus topic to your score. Revision time goes where it actually helps.',
    },
  ]

  const faqs = [
    {
      q: 'Which plan should I pick?',
      a: `Pro is ideal if you're focusing on one subject and want whole-paper marking plus past-paper practice — ${PRO_Q} questions a month is enough for weekly papers. Scholar is our most popular pick: you get ${SCH_Q} questions, in-depth courses (including Edexcel and OxfordAQA study paths into board-dialect marking), detailed examiner feedback, and the full progress journey. Max is for exam season when you're marking daily — ${MAX_Q} questions, projected grades, and priority queue.`,
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
      q: 'Do you have Edexcel or OxfordAQA courses?',
      a: 'Native lesson JSON is Cambridge and IB. For Edexcel IAL and OxfordAQA IAL we give free study paths: our own visual CAIE lessons tagged to your board, then mark in that board\'s dialect. You are not buying a scraped third-party course — you are buying the marking loop that converts.',
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
            <p className="overline">Pricing · your ink history</p>
            <h1 className="h-display pricing-title">
              Keep the scripts <em>you built.</em>
            </h1>
            <p className="lead pricing-lead">
              Every mark becomes a record you own — green stamps, crimson corrections, margin
              notes on <InkScribble>your</InkScribble> handwriting. Start free; upgrade when you
              need more papers in that history.
            </p>
          </div>
          <div className="pricing-hero-sheet" aria-hidden>
            <ExamSheet
              head="Your script · sample"
              headRight="Scholar record"
              tally="4 / 5"
              cite="Endowment: marked work stays readable on every plan"
            >
              <ExamSheetLine work="method clear — chain rule" mark="M1 ✓" ok stampDelayMs={120} />
              <ExamSheetLine work="both stationary points" mark="A1 ✓" ok stampDelayMs={320} />
              <ExamSheetLine
                work="nature: min at x = 1"
                mark="A0 ✗"
                ok={false}
                note="d²y/dx² — check the sign"
                stampDelayMs={520}
              />
            </ExamSheet>
          </div>
        </header>

        <div className="pricing-controls">
          <p className="pricing-allowance-lead">
            How many answers do you mark each month?{' '}
            <span className="mono">
              Free {FREE_Q} · Pro {PRO_Q} · Scholar {SCH_Q} · Max {MAX_Q}
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
              {
                value: 'yearly',
                label: (
                  <>
                    Annual
                    <span className="pricing-toggle-save">2 months free</span>
                  </>
                ),
              },
            ]}
          />
        </div>

        {notice ? (
          <StatusMessage tone="alert" className="pricing-notice">
            {notice}
          </StatusMessage>
        ) : null}

        {/* Phone: one plan at a time. Desktop CSS shows all four (PR-02). */}
        <SegmentedControl
          className="pricing-plan-picker"
          optionClassName="pricing-plan-picker-btn"
          aria-label="Choose a plan to compare"
          value={focusPlan}
          onChange={setFocusPlan}
          options={plans.map((p) => ({ value: p.id, label: p.name }))}
        />

        <div className="plans four" id="plans">
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
                {p.featured ? <span className="plan-ribbon mono">MOST POPULAR</span> : null}
                <p className="plan-tag mono">{p.tag}</p>
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
          <p className="overline pricing-why-kicker">Why Scholar wins</p>
          <h2 id="pricing-why-heading" className="h3 section-title pricing-why-title">
            Most students pick Scholar — here&apos;s why
          </h2>
          <p className="lead pricing-why-lead">
            Pro gets you marking. Scholar gets you <em>exam-ready</em> — courses,
            detailed feedback, and a progress journey that shows exactly where to revise.
          </p>
          <div className="pricing-why-grid">
            {scholarReasons.map((r) => (
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
                const cta = ctaFor('scholar')
                if (cta.href) router.push(cta.href)
                else if (cta.onClick) cta.onClick()
              }}
              disabled={ctaFor('scholar').disabled}
            >
              {ctaFor('scholar').label} <span className="h-4 w-4" aria-hidden>-&gt;</span>
            </button>
          </div>
        </section>

        <details className="pricing-matrix-disclosure">
          <summary className="pricing-matrix-summary">
            Compare every feature across Free, Pro, Scholar, and Max
          </summary>
          <div className="pricing-matrix-body">
            <PlanComparisonMatrix nested />
          </div>
        </details>

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
