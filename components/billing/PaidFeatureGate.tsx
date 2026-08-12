'use client'

import Link from 'next/link'

/**
 * A locked paid feature.
 *
 * Every gate now offers a way to *see* the thing rather than only read about
 * it: /demo is a full account with eighteen marked scripts behind it, which is
 * the only way to show features that are computed from a marking history to
 * someone who does not have one yet.
 */
export function PaidFeatureGate({
  title,
  body,
  feature,
}: {
  title: string
  body: string
  feature: 'whole_paper' | 'mastery_dashboard'
}) {
  return (
    <div className="ec-card ec-card--paper space-y-4 p-6 sm:p-8">
      <span className="ec-ink-stamp ec-ink-stamp--hero" aria-hidden>
        {feature === 'whole_paper' ? 'Q·P' : 'Δ'}
      </span>
      <div>
        <h2 className="text-title text-[var(--ec-text-primary)]">{title}</h2>
        <p className="text-body mt-2 text-[var(--ec-text-secondary)]">{body}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href="/pricing" className="ec-btn-primary inline-flex justify-center">
          {feature === 'whole_paper'
            ? 'Upgrade to mark whole papers →'
            : 'Unlock with any paid plan →'}
        </Link>
        <Link
          // Straight to the panel proving this feature, not the top of /demo.
          href={feature === 'whole_paper' ? '/demo?scene=mark' : '/demo?scene=map'}
          className="ec-btn-ghost inline-flex justify-center"
        >
          See it on a real account →
        </Link>
      </div>
    </div>
  )
}
