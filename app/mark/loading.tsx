import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * ST-01: skeleton only — matches the first-viewport mark desk (hero + upload),
 * no dual ExamLoader + blocks.
 */
export default function MarkLoading() {
  return (
    <main className="app-shell app-shell-tabbed ms-mark-shell" aria-busy="true">
      <span className="sr-only" role="status">
        Loading mark desk
      </span>
      <div className="ms-mark-pg ms-mark-pg--narrow min-w-0">
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-3 h-10 w-full max-w-md" />
        <SkeletonLine className="mb-8 h-4 w-full max-w-lg" />
        <SkeletonBlock className="mb-6 h-48 w-full" />
        <SkeletonBlock className="mb-4 h-14 w-full" />
        <SkeletonBlock className="h-14 w-full" />
      </div>
    </main>
  )
}
