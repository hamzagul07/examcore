import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Shared onboarding loading geometry (ST-01) — route + Suspense use the same shell. */
export function OnboardingSkeleton() {
  return (
    <div className="ms-ob-shell" aria-busy="true">
      <span className="sr-only" role="status">
        Loading setup
      </span>
      <div className="mx-auto w-full max-w-lg pt-10 text-left">
        <SkeletonLine className="mb-8 h-3 w-32" />
        <SkeletonBlock className="mb-6 h-10 w-3/4" />
        <SkeletonBlock className="mb-4 h-16 w-full" />
        <SkeletonBlock className="mb-4 h-16 w-full" />
        <SkeletonBlock className="mb-4 h-16 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  )
}
