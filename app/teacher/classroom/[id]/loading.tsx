import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/**
 * The class week's shape while it loads: head, tabs, a few set slips, the
 * reteach card and the three students-to-watch columns — the same blocks the
 * page renders, so nothing jumps when it arrives.
 */
export default function ClassWeekLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading this class…</span>
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-64 max-w-full" />
        <div className="ms-teacher-tabs" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="mx-1 my-2 h-7 w-16 shrink-0" />
          ))}
        </div>
        <div aria-hidden>
          <SkeletonLine className="mb-4 h-6 w-40" />
          <div className="mb-8 flex flex-col gap-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <SkeletonBlock className="mb-8 h-40 w-full" />
          <div className="ms-students-watch">
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
        </div>
      </div>
    </TeacherPageContainer>
  )
}
