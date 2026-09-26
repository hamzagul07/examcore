import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The print sheet while it loads: an exam-paper-shaped block. */
export default function SetPrintLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Preparing the sheet…</span>
        <SkeletonLine className="mb-6 h-4 w-32" />
        <div className="mx-auto max-w-3xl" aria-hidden>
          <SkeletonBlock className="mb-4 h-10 w-2/3" />
          <SkeletonBlock className="mb-3 h-24 w-full" />
          <SkeletonBlock className="mb-3 h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
