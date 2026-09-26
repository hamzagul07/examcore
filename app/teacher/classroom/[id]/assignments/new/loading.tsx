import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The composer while it loads: head, then the What · Who · When steps and the review slip. */
export default function NewSetLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Opening the composer…</span>
        <SkeletonLine className="mb-6 h-4 w-20" />
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-8 h-10 w-72 max-w-full" />
        <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-hidden>
          <SkeletonBlock className="h-72 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-48 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
