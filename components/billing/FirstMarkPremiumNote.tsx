'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

/**
 * What the first mark got, said once, while the script is still on screen.
 *
 * The premium tier has never been seen by a single user — every paid feature is
 * gated behind a subscription that two people hold, so "Scholar marks more
 * accurately" has always been a claim rather than an experience. This is the
 * one moment the claim can be checked: the student is looking at a verify pass
 * and a rewrite of their own answer, and can be told plainly that the next one
 * will not have them.
 *
 * It names what was given rather than what is withheld, and it does not carry a
 * countdown — the two timed trials this replaces both taught that a deadline
 * gets ignored and then resented. There is nothing to lose by waiting here; the
 * comparison happens on the second mark, by itself.
 *
 * Instrumented as upgrade_viewed{source:'first_mark_premium'} so its effect is
 * measurable against the other upgrade surfaces rather than assumed.
 */
export function FirstMarkPremiumNote() {
  const seenRef = useRef(false)

  useEffect(() => {
    if (seenRef.current) return
    seenRef.current = true
    trackFunnelEvent('upgrade_viewed', { source: 'first_mark_premium' })
  }, [])

  return (
    <aside className="ms-first-mark-note">
      <div className="ms-first-mark-note__head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          1ST
        </span>
        <p className="ec-eyebrow mb-0">Your first mark</p>
      </div>

      <p className="ms-first-mark-note__lead">
        This one was marked the way a <strong>Scholar</strong> mark is marked. Two
        things happened above that normally do not happen on the free plan:
      </p>

      <ul className="ms-first-mark-note__list">
        <li>
          <strong>A second-opinion pass.</strong> Every mark was re-checked against
          the scheme by a second run before you saw it, instead of being reported
          first time.
        </li>
        <li>
          <strong>Your answer, rewritten to full marks.</strong> Not a model answer —
          yours, with the missing marks written in and each addition labelled.
        </li>
      </ul>

      <p className="ms-first-mark-note__foot">
        Your next mark runs without both. Nothing expires and there is no timer —
        we would rather you compare the two and decide.
      </p>

      <Link
        href="/pricing"
        className="ec-btn-ghost ms-first-mark-note__cta"
        onClick={() =>
          trackFunnelEvent('upsell_clicked', { source: 'first_mark_premium' })
        }
      >
        What Scholar does every time
        <span className="font-mono text-[11px] font-bold" aria-hidden>
          -&gt;
        </span>
      </Link>
    </aside>
  )
}
