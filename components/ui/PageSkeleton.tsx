import { cn } from '@/lib/utils'

type BlockProps = {
  className?: string
}

export function SkeletonBlock({ className }: BlockProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[var(--ec-surface-raised)]',
        className
      )}
      aria-hidden
    />
  )
}

export function SkeletonLine({ className }: BlockProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--ec-surface-raised)]',
        className
      )}
      aria-hidden
    />
  )
}
