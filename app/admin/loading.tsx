import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function AdminLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-4xl">
      <SkeletonLine className="mb-3 h-3 w-16" />
      <SkeletonBlock className="mb-8 h-10 w-56" />
      <SkeletonBlock className="mb-6 h-48 w-full" />
      <SkeletonBlock className="h-32 w-full" />
    </div>
  )
}
