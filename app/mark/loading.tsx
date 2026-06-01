import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function MarkLoading() {
  return (
    <main className="app-shell app-shell-tabbed md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-3xl">
        <SkeletonLine className="mb-3 h-3 w-12" />
        <SkeletonBlock className="mb-6 h-12 w-64" />
        <SkeletonLine className="mb-4 h-4 w-32" />
        <SkeletonBlock className="mb-8 h-48 w-full rounded-3xl" />
        <SkeletonLine className="mb-4 h-4 w-40" />
        <SkeletonBlock className="h-32 w-full rounded-3xl" />
        <SkeletonBlock className="mt-8 h-14 w-full rounded-2xl" />
      </div>
    </main>
  )
}
