import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The Sets tab while it loads: head, tabs, the Open / Closed / Drafts switch and set slips. */
export default function ClassSetsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading sets…</span>
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-64 max-w-full" />
        <div aria-hidden>
          <SkeletonBlock className="mb-6 h-11 w-full" />
          <div className="mb-5 flex gap-2">
            <SkeletonBlock className="h-11 w-20" />
            <SkeletonBlock className="h-11 w-20" />
            <SkeletonBlock className="h-11 w-20" />
          </div>
          <div className="flex flex-col gap-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </div>
      </div>
    </TeacherPageContainer>
  )
}
