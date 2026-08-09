import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
  /** Override the stamp label above the body. */
  stamp?: string
}

/**
 * Empty / zero-state copy in examiner voice — the “waiting for ink” paper slip
 * used on momentum, community, and progress hints.
 */
export function WaitingForInk({ children, className, stamp = 'waiting for ink' }: Props) {
  return (
    <div className={cn('ms-waiting-ink', className)}>
      <span className="ms-waiting-ink__stamp" aria-hidden>
        {stamp}
      </span>
      <div className="ms-waiting-ink__body">{children}</div>
    </div>
  )
}
