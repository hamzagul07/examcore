import { cn } from '@/lib/utils'

type BlockProps = {
  className?: string
}

export function SkeletonBlock({ className }: BlockProps) {
  return (
    <div
      className={cn('ec-skeleton-shimmer rounded', className)}
      aria-hidden
    />
  )
}

export function SkeletonLine({ className }: BlockProps) {
  return (
    <div
      className={cn('ec-skeleton-shimmer rounded-lg', className)}
      aria-hidden
    />
  )
}
