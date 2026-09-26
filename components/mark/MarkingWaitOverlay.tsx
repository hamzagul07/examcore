'use client'

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'

type Props = {
  open: boolean
  children: ReactNode
  className?: string
}

/**
 * Mobile marking wait shell: dialog semantics, initial focus, focus trap (MK-02).
 * Desktop keeps the in-flow layout (no modal) — trap only when the surface is fixed.
 *
 * Initial focus goes to the panel itself (tabIndex -1), not to the wait title
 * and not to the first link: the title re-mounts on every headline change
 * (AnimatePresence), and the first link, once the provisional card is up, is
 * "Go and do something else" — which a stray Enter would follow mid-mark.
 * With aria-labelledby the panel announces the title anyway.
 */
export function MarkingWaitOverlay({ open, children, className = '' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobileOverlay, setIsMobileOverlay] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileOverlay(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const trapActive = open && isMobileOverlay
  useFocusTrap(
    trapActive,
    panelRef as RefObject<HTMLElement | null>,
    undefined,
    undefined,
    { restoreFocus: false, initialFocus: 'container' }
  )

  // Keep persistent chrome out of the tab order while the mobile dialog is open.
  useEffect(() => {
    if (!trapActive) return
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'header.ec-app-header, nav.ec-tabbar, nav[aria-label="Main navigation"]'
      )
    )
    for (const el of nodes) el.setAttribute('inert', '')
    return () => {
      for (const el of nodes) el.removeAttribute('inert')
    }
  }, [trapActive])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className={className}
      role={isMobileOverlay ? 'dialog' : 'region'}
      aria-modal={isMobileOverlay ? true : undefined}
      aria-labelledby="marking-wait-title"
      aria-busy="true"
      tabIndex={-1}
    >
      {children}
    </div>
  )
}
