import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Review page in its own geometry: hero, the two-up summary grid, two paper sections. */
export default function ReviewLoading() {
  return (
    <div className="mx-auto max-w-[var(--ec-content-max,860px)] px-4 py-10 sm:px-6">
      <SkeletonLine className="mb-3 h-10 w-full max-w-md" />
      <SkeletonLine className="mb-8 h-4 w-full max-w-sm" />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>
      <SkeletonBlock className="mb-8 h-48 w-full" />
      <SkeletonBlock className="h-56 w-full" />
    </div>
  )
}
