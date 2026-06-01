import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function OnboardingLoading() {
  return (
    <main className="app-shell flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto w-full max-w-lg px-4">
        <SkeletonLine className="mb-4 h-3 w-24" />
        <SkeletonBlock className="mb-6 h-10 w-3/4" />
        <SkeletonBlock className="mb-4 h-12 w-full" />
        <SkeletonBlock className="mb-4 h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </main>
  )
}
