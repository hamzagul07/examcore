'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'

type Action = {
  label: string
  href: string
  onClick?: () => void
}

type Props = {
  open: boolean
  onDismiss: () => void
  /** Two-to-four character stamp in the corner (M1, OK, A0). */
  stamp?: string
  tone?: 'ink' | 'crimson'
  title: ReactNode
  body?: ReactNode
  action?: Action
  /** Label for the dismiss control; defaults to a close glyph. */
  dismissLabel?: string
  /** Auto-dismiss after this many ms. Omit for sticky. */
  autoHideMs?: number
  className?: string
}

/**
 * A paper slip that lands at the bottom of the viewport: one stamp, a line
 * or two, at most one action. Slides in, and — unlike the bespoke toasts it
 * replaces — slides out too: the slip stays mounted for a short closing
 * phase after `open` flips false. Announced politely to screen readers.
 */
export function PaperToast({
  open,
  onDismiss,
  stamp,
  tone = 'ink',
  title,
  body,
  action,
  dismissLabel,
  autoHideMs,
  className,
}: Props) {
  const [mounted, setMounted] = useState(open)
  const wasOpen = useRef(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      wasOpen.current = true
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => setMounted(false), reduce ? 0 : 200)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open || !autoHideMs) return
    const id = window.setTimeout(onDismiss, autoHideMs)
    return () => window.clearTimeout(id)
  }, [open, autoHideMs, onDismiss])

  if (!mounted) return null

  return (
    <div
      className={['ec-toast', className].filter(Boolean).join(' ')}
      data-state={open ? 'open' : 'closing'}
      data-tone={tone}
      inert={!open || undefined}
      role="status"
      aria-live="polite"
    >
      <div className="ec-toast__slip ec-card ec-card--paper">
        {stamp ? (
          <span className="ec-toast__stamp ec-ink-stamp" aria-hidden>
            {stamp}
          </span>
        ) : null}
        <div className="ec-toast__text">
          <p className="ec-toast__title">{title}</p>
          {body ? <p className="ec-toast__body">{body}</p> : null}
          {action ? (
            <div className="ec-toast__actions">
              <Link
                href={action.href}
                onClick={() => {
                  action.onClick?.()
                  onDismiss()
                }}
                className="ec-btn-primary ec-btn-primary--sm ec-toast__action"
              >
                {action.label}
              </Link>
              {dismissLabel ? (
                <button type="button" onClick={onDismiss} className="ec-toast__later">
                  {dismissLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {!action || !dismissLabel ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="ec-toast__close"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  )
}
