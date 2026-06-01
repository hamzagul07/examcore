import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function TeacherReviewsLoading() {
  return (
    <main className="app-shell md:py-10">
      <div className="mx-auto min-w-0 max-w-7xl">
        <SkeletonLine className="mb-3 h-3 w-16" />
        <SkeletonBlock className="mb-8 h-10 w-40" />
        <div className="space-y-3">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </main>
  )
}
