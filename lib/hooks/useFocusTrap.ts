'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The default for `extraRoots`, hoisted so its identity is stable.
 *
 * A `= []` default is a NEW array on every render, and it sat in the trap
 * effect's deps — so the effect re-ran, and refocused the first focusable, on
 * every render of the caller. On the marking wait overlay that is every SSE
 * event; once the provisional-score card mounted, the first focusable was the
 * "Go and do something else" link, and a stray Enter navigated away mid-mark
 * (code review 2026-09-25, §2 Frontend).
 */
const NO_EXTRA_ROOTS: RefObject<HTMLElement | null>[] = []

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
  /**
   * Where focus lands when the trap activates.
   *
   * 'first' (default) — the first focusable, on fine-pointer devices only, so
   * a phone does not pop the keyboard for an input nobody tapped. What every
   * Sheet wants.
   *
   * 'container' — the trapped root itself (it must carry tabIndex={-1}), on
   * every device. For a modal wait surface whose first focusable is a link:
   * focusing the link arms Enter to leave the page; focusing the container
   * announces the dialog's name and arms nothing.
   */
  initialFocus?: 'first' | 'container'
}

/** Keep keyboard focus within container (+ optional extra roots) while active. */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  returnFocusRef?: RefObject<HTMLElement | null>,
  extraRoots: RefObject<HTMLElement | null>[] = NO_EXTRA_ROOTS,
  options: Options = {}
) {
  const { restoreFocus = true, initialFocus = 'first' } = options

  // Where focus was before the trap took it. Most callers (every Sheet) pass
  // no returnFocusRef, and closing then left focus on <body> because the
  // focused close button had unmounted — from there the keyboard no longer
  // reached a self-scrolling surface like the study-mode overlay.
  //
  // Its own effect, keyed on `active` alone, so that restoring the opener
  // never runs from a re-render of the trap itself — on a phone that closed
  // the keyboard mid-word.
  useEffect(() => {
    if (!active || !restoreFocus || returnFocusRef) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      if (opener?.isConnected) focusWithoutScroll(opener)
    }
  }, [active, restoreFocus, returnFocusRef])

  // Initial focus: once per activation, and again only if the trapped ROOT
  // changes (a different element is mounted under the same ref). Never on a
  // re-render of the caller — see NO_EXTRA_ROOTS above.
  const focusedRootRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!active) {
      focusedRootRef.current = null
      return
    }
    const container = containerRef.current
    if (!container || focusedRootRef.current === container) return
    focusedRootRef.current = container

    if (initialFocus === 'container') {
      const raf = requestAnimationFrame(() => focusWithoutScroll(container))
      return () => cancelAnimationFrame(raf)
    }

    const finePointer = window.matchMedia('(pointer: fine)').matches
    if (!finePointer) return
    const items = collectFocusables(container, extraRoots.map((r) => r.current))
    if (!items.length) return
    const raf = requestAnimationFrame(() => focusWithoutScroll(items[0]))
    return () => cancelAnimationFrame(raf)
  }, [active, containerRef, extraRoots, initialFocus])

  // Tab wrapping and, on deactivate, returning focus. Re-running this on a
  // render is harmless: it only swaps a listener and moves no focus.
  useEffect(() => {
    if (!active) return

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
