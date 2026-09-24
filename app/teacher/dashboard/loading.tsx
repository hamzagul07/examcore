import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Stands in for TeacherDashboardClient at the same column (max-w-7xl inside the
 * layout's app-shell — no second <main>, which used to double the padding):
 * desk head with its eyebrow row, headline, handwritten note and the "New class"
 * button, then the class slips at their real height.
 */
export default function TeacherDashboardLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-7xl" aria-busy aria-label="Loading classrooms">
      <div className="ms-teacher-desk-head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonBlock className="h-[22px] w-9" />
          </div>
          <SkeletonBlock className="h-10 w-64 max-w-full sm:h-11" />
          <SkeletonLine className="mt-2 h-4 w-52 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-32" />
      </div>
      <div className="ms-teacher-class-list">
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
      </div>
    </div>
  )
}
