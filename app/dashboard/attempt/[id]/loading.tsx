import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function AttemptLoading() {
  return (
    <main className="app-shell app-shell-tabbed md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-4xl">
        <SkeletonLine className="mb-6 h-4 w-32" />
        <SkeletonBlock className="mb-6 h-24 w-full" />
        <SkeletonBlock className="mb-6 h-64 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </main>
  )
}
