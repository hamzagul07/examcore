import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** A set while it loads: head and actions, the completion matrix, then the gap list. */
export default function SetLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading this set…</span>
        <SkeletonLine className="mb-6 h-4 w-28" />
        <SkeletonLine className="mb-3 h-3 w-16" />
        <SkeletonBlock className="mb-3 h-10 w-80 max-w-full" />
        <SkeletonLine className="mb-6 h-4 w-72 max-w-full" />
        <div aria-hidden>
          <div className="mb-8 flex flex-wrap gap-2">
            <SkeletonBlock className="h-11 w-28" />
            <SkeletonBlock className="h-11 w-24" />
            <SkeletonBlock className="h-11 w-20" />
          </div>
          <SkeletonBlock className="mb-8 h-72 w-full" />
          <SkeletonBlock className="h-48 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
