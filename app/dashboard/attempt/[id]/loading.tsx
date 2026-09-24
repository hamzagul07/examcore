import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Same column as the page (max-w-3xl) so the swap to content is a fill, not
 * a reflow: back link, hero heading + meta, the score card, the result body,
 * then the solution fold.
 */
export default function AttemptLoading() {
  return (
    <main className="app-shell app-shell-tabbed md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-3xl">
        <SkeletonLine className="mb-6 h-4 w-32" />
        <SkeletonLine className="mb-3 h-10 w-full max-w-md" />
        <SkeletonLine className="mb-10 h-4 w-full max-w-sm" />
        <SkeletonBlock className="mb-6 h-44 w-full" />
        <SkeletonBlock className="mb-6 h-64 w-full" />
        <SkeletonBlock className="h-14 w-full" />
      </div>
    </main>
  )
}
