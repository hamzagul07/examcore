import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function DashboardLoading() {
  return (
    <main className="app-shell app-shell-tabbed md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-5xl">
        <SkeletonLine className="mb-3 h-3 w-16" />
        <SkeletonBlock className="mb-8 h-48 w-full" />
        <SkeletonBlock className="mb-8 h-64 w-full max-w-2xl" />
        <div className="grid gap-8 lg:grid-cols-2">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    </main>
  )
}
