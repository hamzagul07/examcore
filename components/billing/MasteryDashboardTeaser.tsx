'use client'

import { PaidFeatureGate } from '@/components/billing/PaidFeatureGate'

export function MasteryDashboardTeaser({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded border border-[var(--ec-border)] shadow-[var(--ec-shadow-hard)]">
      <div className="pointer-events-none select-none opacity-35" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ec-paper,var(--ec-canvas))_72%,transparent)] p-4">
        <div className="max-w-md rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-1 shadow-[var(--ec-shadow-hard,4px_4px_0_rgba(0,0,0,0.1))]">
          <PaidFeatureGate
            feature="mastery_dashboard"
            title="Mastery tracking unlocks with any paid plan"
            body="See topic-by-topic strength, predicted grades, and your syllabus coverage — built from every question you mark."
          />
        </div>
      </div>
    </div>
  )
}
