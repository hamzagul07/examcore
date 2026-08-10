'use client'

import { useId, useState, type ReactNode, type SyntheticEvent } from 'react'

type Props = {
  summary: ReactNode
  children: ReactNode
  className?: string
  summaryClassName?: string
  defaultOpen?: boolean
  /** Optional hint shown on the right of the summary row. */
  hint?: ReactNode
}

/**
 * Accessible expand/collapse using native details/summary (Codex A11Y-01).
 * Prefer this over custom buttons without aria-expanded.
 */
export function Disclosure({
  summary,
  children,
  className = '',
  summaryClassName = '',
  defaultOpen = false,
  hint,
}: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen)

  function handleToggle(e: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(e.currentTarget.open)
  }

  return (
    <details className={className} open={open} onToggle={handleToggle}>
      <summary className={summaryClassName}>
        {summary}
        {hint ? <span className="ms-disclosure__hint">{hint}</span> : null}
      </summary>
      <div id={panelId} className="ms-disclosure__panel">
        {children}
      </div>
    </details>
  )
}
