'use client'

import Link from 'next/link'

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
      <Link href="/pricing" className="ec-btn-primary inline-flex w-full justify-center sm:w-auto">
        {feature === 'whole_paper' ? 'Upgrade to mark whole papers →' : 'Unlock with any paid plan →'}
      </Link>
    </div>
  )
}
