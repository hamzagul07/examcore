'use client'

import type { ReactNode } from 'react'

export type StatusMessageTone = 'status' | 'alert' | 'note'

type Props = {
  children: ReactNode
  /** status = polite live; alert = assertive; note = static (no live region). */
  tone?: StatusMessageTone
  className?: string
  id?: string
}

/**
 * Shared status / alert / note surface (Codex DS primitive).
 * Prefer this over ad-hoc success/error boxes so announcements stay consistent.
 */
export function StatusMessage({
  children,
  tone = 'status',
  className = '',
  id,
}: Props) {
  const role = tone === 'alert' ? 'alert' : tone === 'status' ? 'status' : undefined
  const live =
    tone === 'alert' ? ('assertive' as const) : tone === 'status' ? ('polite' as const) : undefined

  return (
    <div
      id={id}
      role={role}
      aria-live={live}
      className={className}
    >
      {children}
    </div>
  )
}
