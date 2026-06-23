'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  )
}

function collectFocusables(
  container: HTMLElement | null,
  extraRoots: (HTMLElement | null)[]
): HTMLElement[] {
  const extras = extraRoots.filter(Boolean) as HTMLElement[]
  return [
    ...extras.flatMap(getFocusables),
    ...(container ? getFocusables(container) : []),
  ]
}

/** Keep keyboard focus within container (+ optional extra roots) while active. */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  returnFocusRef?: RefObject<HTMLElement | null>,
  extraRoots: RefObject<HTMLElement | null>[] = []
) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const extras = extraRoots.map((r) => r.current)
    const items = collectFocusables(container, extras)
    if (!items.length) return

    requestAnimationFrame(() => {
      items[0]?.focus()
    })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = collectFocusables(containerRef.current, extraRoots.map((r) => r.current))
      if (!focusables.length) return
      const head = focusables[0]
      const tail = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === head) {
          e.preventDefault()
          tail.focus()
        }
      } else if (document.activeElement === tail) {
        e.preventDefault()
        head.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      returnFocusRef?.current?.focus()
    }
  }, [active, containerRef, returnFocusRef, extraRoots])
}
