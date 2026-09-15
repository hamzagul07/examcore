'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { DISPLAY_PRICES_USD } from '@/lib/polar/products'

/**
 * What the first mark got, said once, while the script is still on screen.
 *
 * The premium tier has never been seen by a single user — every paid feature is
 * gated behind a subscription two people hold — so this is the one moment a paid
 * claim can be checked against the student's own script.
 *
 * It claims the rewrite and nothing else, deliberately. An earlier draft also
 * claimed a second-opinion verify pass, which was simply untrue: markSingleQuestion
 * defaults `verify = true` regardless of tier, and isPaid only gates the verify
 * pass on split scripts of more than three questions. A free student's ordinary
 * first mark therefore runs the identical pipeline their second one runs, and
 * the one surface built to make the paid claim checkable would have disproved
 * it on the second mark. The rewrite is genuinely gated, so the rewrite is what
 * this says.
 *
 * Rendered only when a rewrite is actually attached (see the call site): the
 * pipeline skips it for MCQ answers and for anyone who scored full marks, and
 * promising a panel that is not on the page is the same failure again.
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
  // Points at Starter, not Scholar. This is the one loss-frame moment the
  // product has, and it was aimed at $19.99 — the price the Starter tier was
  // introduced to stop being the first step. Read from the same constant the
  // pricing page renders so the two can never drift.
  const starterPrice = `$${(DISPLAY_PRICES_USD.student.monthly / 100).toFixed(2)}`

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
        The panel above — <strong>your answer, rewritten to full marks</strong> — is
        a paid feature. Not a model answer: yours, with the missing marks written
        in and each addition labelled.
      </p>

      <p className="ms-first-mark-note__foot">
        You get it once, on your first mark. Your next one comes back with the
        score and the scheme, but without the rewrite. Nothing expires and there
        is no timer — we would rather you see it once and decide.
      </p>

      <Link
        href="/pricing"
        className="ec-btn-ghost ms-first-mark-note__cta"
        onClick={() =>
          trackFunnelEvent('upsell_clicked', { source: 'first_mark_premium' })
        }
      >
        Keep it from {starterPrice}/month
        <span className="font-mono text-[11px] font-bold" aria-hidden>
          -&gt;
        </span>
      </Link>
    </aside>
  )
}
