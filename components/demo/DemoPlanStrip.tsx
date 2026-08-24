'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Pricing, near the top instead of past eight scenes of scrolling.
 *
 * The full comparison table still sits at the bottom for anyone who reads that
 * far; this is the version for everyone who does not. It answers the two
 * questions a student actually has on arrival — *what does it cost* and *what do
 * I get for free* — before asking them to look at anything.
 *
 * The annual saving is computed from the two list prices rather than typed, so
 * it cannot end up advertising a discount that is not real: at 10× monthly for
 * twelve months, Scholar's yearly price is genuinely ~17% off.
 */
export function DemoPlanStrip({
  scholarMonthlyCents,
  scholarYearlyCents,
  maxMonthlyCents,
  freeQuestions,
  scholarQuestions,
  maxQuestions,
}: {
  scholarMonthlyCents: number
  scholarYearlyCents: number
  maxMonthlyCents: number
  freeQuestions: number
  scholarQuestions: number
  maxQuestions: number
}) {
  const [annual, setAnnual] = useState(false)

  const money = (cents: number) =>
    cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`

  const savingPct = Math.round(
    (1 - scholarYearlyCents / (scholarMonthlyCents * 12)) * 100
  )

  const scholarPrice = annual
    ? money(scholarYearlyCents)
    : money(scholarMonthlyCents)
  const scholarUnit = annual ? '/year' : '/month'

  return (
    <section className="demo-plans" aria-label="What it costs">
      <div className="demo-plans__head">
        <p className="ms-overline demo-plans__eyebrow">What it costs</p>
        <div className="demo-plans__toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={!annual ? 'demo-toggle demo-toggle--on' : 'demo-toggle'}
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
          >
            Monthly
          </button>
          <button
            type="button"
            className={annual ? 'demo-toggle demo-toggle--on' : 'demo-toggle'}
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
          >
            Yearly
            {savingPct > 0 && (
              <span className="demo-toggle__save mono">−{savingPct}%</span>
            )}
          </button>
        </div>
      </div>

      <ul className="demo-plans__grid">
        <li className="demo-plan">
          <p className="demo-plan__name mono">Free</p>
          <p className="demo-plan__price">
            $0<span className="demo-plan__unit">/month</span>
          </p>
          <p className="demo-plan__line">
            {freeQuestions} questions a month, marked in full — the ink, the
            reason for every mark, and all the course notes.
          </p>
          <Link href="/mark" className="ec-btn-ghost demo-plan__cta">
            Mark one now
          </Link>
        </li>

        <li className="demo-plan demo-plan--pick">
          <p className="demo-plan__name mono">
            {/* Flag said "Most students" — an unbacked popularity claim at the
                current subscriber count. Reinstate when the numbers say so. */}
            Scholar<span className="demo-plan__flag">Whole papers</span>
          </p>
          <p className="demo-plan__price">
            {scholarPrice}
            <span className="demo-plan__unit">{scholarUnit}</span>
          </p>
          <p className="demo-plan__line">
            {scholarQuestions} a month, plus the rewrite, the mastery map, your
            trajectory, the drills and the whole of every lesson.
          </p>
          <Link href="/pricing" className="ec-btn-primary demo-plan__cta">
            Get Scholar
          </Link>
        </li>

        <li className="demo-plan">
          <p className="demo-plan__name mono">Max</p>
          <p className="demo-plan__price">
            {money(maxMonthlyCents)}
            <span className="demo-plan__unit">/month</span>
          </p>
          <p className="demo-plan__line">
            {maxQuestions} a month, every subject you take, priority marking and
            the Sunday examiner email.
          </p>
          <Link href="/pricing" className="ec-btn-ghost demo-plan__cta">
            Compare plans
          </Link>
        </li>
      </ul>

      <p className="demo-plans__foot">
        Your first mark is free and needs no account. Cancel whenever — anything
        you marked stays in your account either way.
      </p>
    </section>
  )
}
