'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/courses/margin-notes/Breadcrumb'
import { InkScribble } from '@/components/courses/margin-notes/HandAnnotations'
import { CourseRichText } from '@/components/courses/CourseRichText'
import type { PricingDisplay } from '@/lib/billing/display-prices'
import { formatMoney } from '@/lib/billing/format'
import { buildSignUpHref } from '@/lib/auth-redirect'

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
  founding: boolean
}

export function PricingMarginNotesPage({ display, signedIn, founding }: Props) {
  const plusMonthly = display.scholar?.monthly
  const plusWas = plusMonthly ? Math.round(plusMonthly.amountCents * 2) : null
  const plusPrice = plusMonthly
    ? formatMoney(plusMonthly.amountCents, plusMonthly.currency)
    : '£3.50'

  const plans = [
    {
      name: 'Free',
      price: formatMoney(0, display.currency),
      per: 'forever',
      tag: 'No card required',
      blurb: 'Everything you need to start marking and learning.',
      cta: 'Start free',
      href: '/courses',
      primary: false,
      features: [
        ['All free courses', true],
        ['Visual lessons + flashcards', true],
        ['Mark up to 10 questions / day', true],
        ['Whole paper: first 3 questions', true],
        ['Mark-by-mark official scheme', true],
        ['Projected grade estimates', false],
        ['Unlimited whole-paper marking', false],
      ] as [string, boolean][],
    },
    {
      name: 'Plus',
      price: plusPrice,
      was: plusWas ? formatMoney(plusWas, display.currency) : undefined,
      per: '/ month',
      tag: founding ? 'Founding members · 50% off forever' : 'Student plan',
      blurb: 'For students sitting real exams who want every mark.',
      cta: signedIn ? 'Upgrade in billing' : 'Become a founding member',
      href: signedIn ? '/dashboard/billing' : buildSignUpHref('/pricing'),
      primary: true,
      features: [
        ['All free courses', true],
        ['Visual lessons + flashcards', true],
        ['Unlimited daily marking', true],
        ['Whole paper marking', true],
        ['Mark-by-mark official scheme', true],
        ['Projected grade estimates', true],
        ['Priority marking + study chat', true],
      ] as [string, boolean][],
    },
  ]

  const faqs = [
    {
      q: 'Are the courses really free?',
      a: 'Yes — all courses, every lesson, flashcards and exam tips are free forever, no card required. Plus only adds unlimited marking and projected grades.',
    },
    {
      q: 'What does “founding member” mean?',
      a: 'Sign up while we’re young and your 50% discount is locked in for as long as you keep your subscription — even after prices rise.',
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
            The courses are <em>free.</em>
            <br />
            Always.
          </h1>
          <p className="lead pricing-lead">
            Every course, lesson and flashcard is free forever. Plus unlocks unlimited marking and
            projected grades — and founding members lock in{' '}
            <InkScribble>50% off, forever</InkScribble>.
          </p>
        </header>

        <div className="plans">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`plan card${p.primary ? ' featured' : ''}`}
              data-screen-label={`Pricing — ${p.name}`}
            >
              {p.primary ? <span className="plan-ribbon mono">MOST POPULAR</span> : null}
              <p className="plan-tag mono">{p.tag}</p>
              <h3 className="plan-name serif">{p.name}</h3>
              <div className="plan-price">
                {p.was ? <span className="plan-was">{p.was}</span> : null}
                <span className="plan-now serif">{p.price}</span>
                <span className="plan-per">{p.per}</span>
              </div>
              <p className="body-2 plan-blurb">{p.blurb}</p>
              <Link
                className={`plan-cta ${p.primary ? 'btn-primary' : 'btn-ghost'}`}
                href={p.href}
              >
                {p.cta}
              </Link>
              <ul className="plan-feats">
                {p.features.map((f, i) => (
                  <li key={i} className={f[1] ? 'yes' : 'no'}>
                    <span className="feat-mark">{f[1] ? '✓' : '—'}</span>
                    <span>{f[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pricing-faqs">
          <h2 className="h3 section-title">Honest answers</h2>
          {faqs.map((f, i) => (
            <Faq key={i} f={f} />
          ))}
        </div>

        <p className="micro pricing-footnote">
          FREE TIER AVAILABLE · FOUNDING MEMBERS GET 50% OFF FOREVER · NOT ENDORSED BY CAMBRIDGE
          INTERNATIONAL
        </p>
      </div>
    </main>
  )
}
