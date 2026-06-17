'use client'

import { useEffect, type RefObject } from 'react'

/** Light haptic pulse for primary actions on supported mobile browsers. */
export function triggerPrimaryHaptic(): void {
  if (typeof window === 'undefined') return
  if (!window.navigator?.vibrate) return
  try {
    window.navigator.vibrate(10)
  } catch {
    // vibrate blocked or unsupported
  }
}

/** Interactive targets that should show press feedback inside course shells. */
export const TAP_FEEDBACK_SELECTOR = [
  'button:not(:disabled):not([aria-busy="true"])',
  '[role="button"]:not([aria-disabled="true"]):not([aria-busy="true"])',
  'a.btn-primary',
  'a.btn-ghost',
  '.fpart',
  '.fsym',
  '.cmap-node',
  '.fcard',
  '.worked-reveal',
  '.course-worked-reveal-btn',
  '.paper-tab',
  '.mode-tab',
  '.cmdk-btn',
  '.theme-flip',
  '.burger',
  '.catalog-fam',
  '.catalog-empty-reset',
  '.continue-card',
  '.gloss',
  '.qc',
  '.fc-arrow',
  '.practice-scheme-toggle',
].join(', ')

const TAP_MS = 200

/**
 * Adds a brief `mn-tapped` class on pointer down so clicks feel responsive
 * even on fast taps where `:active` is easy to miss.
 */
export function useTapFeedback(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return

      const el = target.closest(TAP_FEEDBACK_SELECTOR)
      if (!el || !root.contains(el)) return
      if (el.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]')) return

      el.classList.add('mn-tapped')
      if (el.matches('.btn-primary, .worked-reveal, .course-worked-reveal-btn')) {
        triggerPrimaryHaptic()
      }
      window.setTimeout(() => el.classList.remove('mn-tapped'), TAP_MS)
    }

    root.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => root.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [rootRef])
}
