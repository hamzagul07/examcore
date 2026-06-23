import { ExamLoader } from '@/components/ui/ExamLoader'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function MarkLoading() {
  return (
    <main className="ms-mark-shell" aria-busy="true" aria-label="Loading mark mode">
      <div className="ec-page-loading ec-page-loading--compact">
        <ExamLoader size="md" rotateHints label="Preparing mark mode…" />
      </div>
      <div className="mx-auto min-w-0 w-full max-w-3xl px-4">
        <SkeletonLine className="mb-6 h-4 w-32" />
        <SkeletonBlock className="mb-6 h-56 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </main>
  )
}
