import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function TeacherLoading() {
  return (
    <main className="app-shell md:py-10">
      <div className="mx-auto min-w-0 max-w-7xl">
        <SkeletonLine className="mb-3 h-3 w-20" />
        <SkeletonBlock className="mb-8 h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonBlock className="h-36 w-full" />
          <SkeletonBlock className="h-36 w-full" />
          <SkeletonBlock className="h-36 w-full sm:col-span-2 lg:col-span-1" />
        </div>
      </div>
    </main>
  )
}
