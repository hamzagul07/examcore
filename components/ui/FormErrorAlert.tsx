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
      className={`${variant === 'warning' ? 'ms-auth-warning' : 'ms-auth-error'} outline-none ${className}`.trim()}
    >
      {message ? <p className="m-0">{message}</p> : null}
      {children}
    </div>
  )
}
