import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function JoinLoading() {
  return (
    <div className="ec-card w-full p-8 text-center">
      <SkeletonBlock className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
      <SkeletonLine className="mx-auto mb-3 h-3 w-24" />
      <SkeletonBlock className="mx-auto mb-2 h-8 w-48" />
      <SkeletonLine className="mx-auto h-4 w-56" />
    </div>
  )
}
