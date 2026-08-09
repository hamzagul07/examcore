import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Matches the class-slip list geometry on the teacher dashboard. */
export default function TeacherDashboardLoading() {
  return (
    <main className="app-shell md:py-10">
      <div className="mx-auto min-w-0 max-w-7xl">
        <SkeletonLine className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-8 h-10 w-56 max-w-full" />
        <div className="ms-teacher-class-list">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </main>
  )
}
