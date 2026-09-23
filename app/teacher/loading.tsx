import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Shared teacher-route shell: a desk head and a slip list, at the layout's own
 * column (the layout already wraps children in <main class="app-shell">, so
 * this must not add a second one).
 */
export default function TeacherLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-7xl" aria-busy aria-label="Loading">
      <div className="ms-teacher-desk-head">
        <div>
          <SkeletonLine className="mb-3 h-3 w-28" />
          <SkeletonBlock className="h-10 w-64 max-w-full sm:h-11" />
          <SkeletonLine className="mt-2 h-4 w-52 max-w-full" />
        </div>
      </div>
      <div className="ms-teacher-class-list">
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
      </div>
    </div>
  )
}
