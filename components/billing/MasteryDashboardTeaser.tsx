'use client'

import { PaidFeatureGate } from '@/components/billing/PaidFeatureGate'

export function MasteryDashboardTeaser({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="pointer-events-none select-none opacity-50"
        aria-hidden
        style={{ filter: 'blur(2px)' }}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ec-canvas)_55%,transparent)] p-4">
        <div className="max-w-md">
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
