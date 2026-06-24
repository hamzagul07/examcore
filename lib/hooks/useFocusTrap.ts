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

function focusWithoutScroll(el: HTMLElement | null | undefined) {
  try {
    el?.focus({ preventScroll: true })
  } catch {
    el?.focus()
  }
}

type Options = {
  /** When false, skip returning focus on deactivate (e.g. after navigation). */
  restoreFocus?: boolean
}

/** Keep keyboard focus within container (+ optional extra roots) while active. */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  returnFocusRef?: RefObject<HTMLElement | null>,
  extraRoots: RefObject<HTMLElement | null>[] = [],
  options: Options = {}
) {
  const { restoreFocus = true } = options

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const extras = extraRoots.map((r) => r.current)
    const items = collectFocusables(container, extras)
    if (!items.length) return

    const finePointer = window.matchMedia('(pointer: fine)').matches
    if (finePointer) {
      requestAnimationFrame(() => {
        focusWithoutScroll(items[0])
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = collectFocusables(containerRef.current, extraRoots.map((r) => r.current))
      if (!focusables.length) return
      const head = focusables[0]
      const tail = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === head) {
          e.preventDefault()
          focusWithoutScroll(tail)
        }
      } else if (document.activeElement === tail) {
        e.preventDefault()
        focusWithoutScroll(head)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (restoreFocus) {
        focusWithoutScroll(returnFocusRef?.current ?? null)
      }
    }
  }, [active, containerRef, returnFocusRef, extraRoots, restoreFocus])
}
