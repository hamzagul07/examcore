'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * "Try again" for a server-rendered teacher page whose data failed to load.
 *
 * A link to the page's own path cannot do this: LoadingLink (and Next's
 * <Link>) treat a same-path click as "already here" and only scroll, so the
 * teacher's one recovery action did nothing. This re-runs the page's server
 * components in place with router.refresh() — keeping scroll and any client
 * state — and shows a pending label until the new render lands. If the read
 * fails again, the same error slip comes back.
 */
export function RetryButton({
  label = 'Try again',
  pendingLabel = 'Reloading…',
  className = 'ec-btn-secondary inline-flex min-h-[44px] items-center',
}: {
  label?: string
  pendingLabel?: string
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => startTransition(() => router.refresh())}
    >
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </button>
  )
}
