'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  message: string
  /** When true, scroll into view and move focus for screen readers. */
  focusOnShow?: boolean
  variant?: 'error' | 'warning'
  children?: ReactNode
  className?: string
}

const VARIANT_CLASS = {
  error:
    'border-[color-mix(in_srgb,var(--ec-chip-critical-text)_30%,transparent)] bg-[var(--ec-chip-critical-bg)] text-[var(--ec-chip-critical-text)]',
  warning:
    'border-[color-mix(in_srgb,var(--ec-chip-warning-text)_30%,transparent)] bg-[var(--ec-chip-warning-bg)] text-[var(--ec-banner-warning-title)]',
}

/** Accessible inline form error — announces to assistive tech and can receive focus. */
export function FormErrorAlert({
  message,
  focusOnShow = true,
  variant = 'error',
  children,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focusOnShow || !message) return
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [message, focusOnShow])

  if (!message && !children) return null

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={`rounded-2xl border p-3.5 text-sm backdrop-blur outline-none ${VARIANT_CLASS[variant]} ${className}`.trim()}
    >
      {message ? <p>{message}</p> : null}
      {children}
    </div>
  )
}
