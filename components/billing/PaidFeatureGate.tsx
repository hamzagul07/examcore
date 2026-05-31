'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

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
    <div className="ec-card space-y-4 p-6 sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]">
        <Sparkles className="h-5 w-5 text-[var(--ec-brand)]" />
      </div>
      <div>
        <h2 className="text-title text-[var(--ec-text-primary)]">{title}</h2>
        <p className="text-body mt-2 text-[var(--ec-text-secondary)]">{body}</p>
      </div>
      <Link href="/pricing" className="ec-btn-primary inline-flex w-full justify-center sm:w-auto">
        {feature === 'whole_paper' ? 'Upgrade to mark whole papers' : 'Unlock with any paid plan'}
      </Link>
    </div>
  )
}
