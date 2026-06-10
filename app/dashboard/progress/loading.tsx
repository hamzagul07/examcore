import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function ProgressLoading() {
  return (
    <main className="app-shell app-shell-tabbed ms-dash-page">
      <div className="mx-auto min-w-0 w-full max-w-7xl">
        <SkeletonLine className="mb-6 h-3 w-24" />
        <SkeletonBlock className="mb-6 h-10 w-full max-w-xl" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-11 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <SkeletonBlock className="h-96 w-full rounded-2xl" />
      </div>
    </main>
  )
}
