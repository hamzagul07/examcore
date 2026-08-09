import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Matches the mature home geometry (DB-02) — same max-width as the page. */
export default function DashboardLoading() {
  return (
    <main className="app-shell app-shell-tabbed ms-dash-home">
      <div className="mx-auto min-w-0 max-w-7xl rounded-none px-0 pb-8 pt-0 sm:rounded">
        <SkeletonLine className="mb-3 h-3 w-20" />
        <SkeletonBlock className="mb-6 h-28 w-full max-w-xl" />
        <SkeletonBlock className="mb-6 h-40 w-full" />
        <SkeletonBlock className="mb-6 h-24 w-full" />
        <SkeletonBlock className="mb-4 h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </main>
  )
}
