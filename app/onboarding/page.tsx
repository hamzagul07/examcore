'use client'

import { Suspense } from 'react'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

function OnboardingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-[var(--ec-text-secondary)]">Loading...</p>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingWizard />
    </Suspense>
  )
}
