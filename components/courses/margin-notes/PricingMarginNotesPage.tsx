'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { InkScribble } from '@/components/courses/margin-notes/HandAnnotations'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { PricingDisplay, SubscriptionDisplayPrices } from '@/lib/billing/display-prices'
import type { EffectiveAccess } from '@/lib/billing/access'
import type { RegionChoice } from '@/lib/billing/region-cookie'
import type { SubscriptionTier } from '@/lib/database.types'
import { formatMoney } from '@/lib/billing/format'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { INTERACTIVE_DIAGRAMS_FREE } from '@/lib/billing/features'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { PlanComparisonMatrix } from '@/components/courses/margin-notes/PlanComparisonMatrix'

type Period = 'monthly' | 'yearly'

function Faq({ f }: { f: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq${open ? ' on' : ''}`}>
      <button
        type="button"
        className="faq-q"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
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

export function PricingMarginNotesPage({ display, signedIn, access, currentTier }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('yearly')
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
        label: loading ? 'Opening checkout…' : `Start free trial → ${PLAN_NAME[plan]}`,
        href: buildSignUpHref('/pricing'),
        variant: featured ? 'primary' : 'ghost',
      }
    }

    if (currentTier === product) {
      return { label: 'Your current plan', variant: 'muted', disabled: true }
    }

    const planRank = TIER_RANK[product]
    // First Scholar/Max subscription starts with a 7-day free trial (see
    // checkout API). Pro checkouts charge immediately.
    const hasCheckoutTrial = plan === 'scholar' || plan === 'max'
    const verb =
      currentRank === 0 || access === 'trial'
        ? hasCheckoutTrial
          ? `Try ${PLAN_NAME[plan]} free for 7 days`
          : `Choose ${PLAN_NAME[plan]}`
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
    trialPill?: string
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
      blurb: 'Every lesson, formula and worked example — forever. Enough marking to see if it clicks.',
      killer: `${FREE_Q} marked questions every month — no card, no expiry`,
      now: formatMoney(0, cur),
      per: 'forever',
      sub: null,
      features: [
        ['All lessons, notes & worked examples', true],
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
      blurb: 'Real examiner-style marking on past papers — whole papers, flashcards, and enough headroom for weekly practice.',
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
      blurb: 'The complete toolkit — detailed marking feedback, topic mastery tracking, and in-depth courses that actually teach the syllabus.',
      killer: `${SCH_Q} questions + mastery matrix & grade journey`,
      trialPill: '7-day free trial',
      now: scholarPrice.now,
      per: scholarPrice.per,
      sub: scholarPrice.sub,
      featured: true,
      features: [
        ['Everything in Pro', true],
        [`${SCH_Q} marked questions / month`, true],
        [`${SCH_OMNI} study-chat messages / month`, true],
        ['In-depth, interactive courses', true],
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
      trialPill: '7-day free trial',
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
      icon: FileCheck,
      title: 'Official mark schemes',
      body: 'B1, M1, A1 — marked against the real Cambridge or IB scheme for that exact question, not a generic AI guess.',
    },
    {
      icon: Target,
      title: 'Whole-paper marking',
      body: 'Upload a full past paper and get every question marked in one go — up to 15 questions per paper on paid plans.',
    },
    {
      icon: BarChart3,
      title: 'Progress that matters',
      body: 'Topic mastery matrix, grade trajectory, and weak-spot radar — see exactly where marks are being lost.',
    },
    {
      icon: MessageSquare,
      title: 'Ask MarkScheme',
      body: 'Study chat that knows your subjects, your attempts, and the syllabus — not a generic homework bot.',
    },
  ]

  const scholarReasons = [
    {
      icon: GraduationCap,
      title: 'Courses that teach the syllabus',
      body: 'Interactive lessons with diagrams, worked examples, and topic-by-topic coverage — not just marking.',
    },
    {
      icon: Sparkles,
      title: 'Feedback an examiner would write',
      body: 'Detailed mark-by-mark breakdowns with margin notes on your handwriting — the same style as our landing demo.',
    },
    {
      icon: BookOpen,
      title: 'Know your weak topics',
      body: 'Mastery matrix maps every syllabus topic to your score. Revision time goes where it actually helps.',
    },
  ]

  const faqs = [
    {
      q: 'Which plan should I pick?',
      a: `Pro is ideal if you're focusing on one subject and want whole-paper marking plus past-paper practice — ${PRO_Q} questions a month is enough for weekly papers. Scholar is our most popular pick: you get ${SCH_Q} questions, in-depth courses, detailed examiner feedback, and the full progress journey — plus a 7-day free trial on your first subscription. Max is for exam season when you're marking daily — ${MAX_Q} questions, projected grades, and priority queue.`,
    },
    {
      q: 'How does the free trial work?',
      a: `There is no automatic trial when you sign up — you start on the free plan (${FREE_Q} questions and ${FREE_OMNI} study-chat messages per month). When you're ready, go to this pricing page and start Scholar or Max: your first subscription includes a 7-day free trial (card required, nothing charged until day 8). Cancel anytime before then. Pro is billed from day one with no trial.`,
    },
    {
      q: 'What makes the marking different from ChatGPT?',
      a: 'We mark against the real Cambridge or IB mark scheme for that exact past-paper question — B1/M1/A1 method marks, MCQ keys, essay bands. You get point-by-point feedback on your handwriting with Examiner\'s Ink, not a generic "good effort" paragraph.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel in a couple of clicks from your account and you keep access until the end of the period you\'ve paid for. No lock-in, no cancellation fees.',
    },
  ]

  return (
    <main className="pricing-page ec-page-mesh" data-screen-label="Pricing">
      <div className="pg">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Pricing' }]} />

        <header className="pricing-hero">
          <p className="overline">Pricing · honest &amp; student-first</p>
          <h1 className="h-display pricing-title">
            Mark like it&apos;s <em>exam day.</em>
            <br />
            Starting today.
          </h1>
          <p className="lead pricing-lead">
            Official Cambridge &amp; IB mark schemes, point by point on your handwriting —{' '}
            <InkScribble>not a generic AI paragraph</InkScribble>. Start free, upgrade
            only when you need more.
          </p>
        </header>

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
                {p === 'yearly' ? <span className="pricing-toggle-save">2 months free</span> : null}
              </button>
            ))}
          </div>
        </div>

        {notice ? <p className="pricing-notice">{notice}</p> : null}

        <div className="plans four" id="plans">
          {plans.map((p) => {
            const cta = ctaFor(p.id)
            return (
              <div
                key={p.id}
                className={`plan card${p.featured ? ' featured pricing-card--featured pricing-card-mesh' : ''}`}
                data-plan={p.id}
                data-screen-label={`Pricing — ${p.name}`}
              >
                {p.featured ? <span className="plan-ribbon mono">MOST POPULAR</span> : null}
                {/* Always rendered (hidden when empty) so the pill row lines up across cards. */}
                <span
                  className={`plan-trial-pill mono${p.trialPill ? '' : ' is-empty'}`}
                  aria-hidden={p.trialPill ? undefined : true}
                >
                  {p.trialPill ?? ' '}
                </span>
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
                  <Zap className="plan-killer-icon" aria-hidden />
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
                        {f[1] ? <CheckCircle2 className="h-4 w-4" /> : '—'}
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
            <CheckCircle2 className="pricing-trust-icon" aria-hidden />
            Cancel anytime — no lock-in
          </span>
          <span className="pricing-trust-item">
            <CheckCircle2 className="pricing-trust-icon" aria-hidden />
            15 Cambridge subjects + IB Diploma
          </span>
          <span className="pricing-trust-item">
            <CheckCircle2 className="pricing-trust-icon" aria-hidden />
            Marked against official schemes
          </span>
          <span className="pricing-trust-item">
            <CheckCircle2 className="pricing-trust-icon" aria-hidden />
            Billed in {cur.toUpperCase()} · local currency at checkout
          </span>
        </div>

        <div className="pricing-value-strip" role="list" aria-label="Key benefits">
          {valueProps.map((v) => (
            <div key={v.title} className="pricing-value-item" role="listitem">
              <span className="pricing-value-icon" aria-hidden>
                <v.icon className="h-5 w-5" />
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
              <div key={r.title} className="pricing-why-card card">
                <span className="pricing-why-card-icon" aria-hidden>
                  <r.icon className="h-6 w-6" />
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
              {ctaFor('scholar').label} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <PlanComparisonMatrix />

        <div className="pricing-faqs">
          <h2 className="h3 section-title">Honest answers</h2>
          {faqs.map((f, i) => (
            <Faq key={i} f={f} />
          ))}
        </div>

        <p className="micro pricing-footnote">
          7-DAY FREE TRIAL ON SCHOLAR &amp; MAX (VIA PRICING) · FREE PLAN FOREVER ·
          NOT ENDORSED BY CAMBRIDGE INTERNATIONAL
        </p>

        <PageHelpStrip className="mt-10" />
      </div>
    </main>
  )
}
