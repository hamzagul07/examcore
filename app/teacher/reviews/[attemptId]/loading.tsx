import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** One script's shape while it loads: head, question, the script beside the console, notes. */
export default function TeacherReviewDetailLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the script…</span>
        <SkeletonLine className="mb-6 h-4 w-32" />
        <SkeletonLine className="mb-3 h-3 w-20" />
        <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-80 max-w-full" />
        <SkeletonBlock className="mb-6 h-24 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5" aria-hidden>
          <SkeletonBlock className="h-[28rem] w-full lg:col-span-3" />
          <SkeletonBlock className="h-[28rem] w-full lg:col-span-2" />
        </div>
        <SkeletonBlock className="mt-8 h-40 w-full" />
      </div>
    </TeacherPageContainer>
  )
}
