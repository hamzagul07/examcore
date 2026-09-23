import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Stands in for the mature home (DB-02) in its real geometry, so the swap
 * to content is a fill, not a reflow: greeting line, headline, next action,
 * today's plan, momentum strip, then the two collapsible section rails.
 */
export default function DashboardLoading() {
  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded">
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonLine className="mb-2 h-9 w-full max-w-md" />
        <SkeletonLine className="mb-6 h-4 w-full max-w-sm" />
        <SkeletonBlock className="mb-6 h-36 w-full" />
        <SkeletonBlock className="mb-6 h-40 w-full" />
        <SkeletonBlock className="mb-6 h-28 w-full" />
        <SkeletonBlock className="mb-4 h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </main>
  )
}
