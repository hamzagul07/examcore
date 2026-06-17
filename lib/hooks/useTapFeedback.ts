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

export type TapFeedbackConfig = {
  selector: string
  tappedClass: string
  hapticSelector?: string
  /** Ignore taps on elements inside this selector (e.g. course shell has its own feedback). */
  skipWithin?: string
}

/** Interactive targets inside Margin Notes course pages. */
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

export const COURSE_TAP_CONFIG: TapFeedbackConfig = {
  selector: TAP_FEEDBACK_SELECTOR,
  tappedClass: 'mn-tapped',
  hapticSelector: '.btn-primary, .worked-reveal, .course-worked-reveal-btn',
}

/** App chrome: mark, dashboard, nav — skips nested course shells. */
export const APP_TAP_FEEDBACK_SELECTOR = [
  'button:not(:disabled):not([aria-busy="true"])',
  '[role="button"]:not([aria-disabled="true"]):not([aria-busy="true"])',
  'a.ec-btn-primary',
  'a.ec-btn-secondary',
  'a.ec-btn-ghost',
  'a.ec-btn-danger',
  '.ec-btn-primary',
  '.ec-btn-secondary',
  '.ec-btn-ghost',
  '.ec-btn-danger',
  '.ec-nav-link',
  '.ec-nav-mark-mobile',
  '.ec-avatar-btn',
  '.ec-pill',
  '.ec-tabbar a',
  '.mark-submit-btn',
].join(', ')

export const APP_TAP_CONFIG: TapFeedbackConfig = {
  selector: APP_TAP_FEEDBACK_SELECTOR,
  tappedClass: 'ec-tapped',
  hapticSelector: '.ec-btn-primary, .ec-btn-secondary, .mark-submit-btn',
  skipWithin: '.course-root',
}

const TAP_MS = 200

/**
 * Adds a brief tapped class on pointer down so clicks feel responsive
 * even on fast taps where `:active` is easy to miss.
 */
export function useTapFeedback(
  rootRef: RefObject<HTMLElement | null>,
  config: TapFeedbackConfig = COURSE_TAP_CONFIG
) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return

      const el = target.closest(config.selector)
      if (!el || !root.contains(el)) return
      if (config.skipWithin && el.closest(config.skipWithin)) return
      if (el.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]')) return

      el.classList.add(config.tappedClass)
      if (config.hapticSelector && el.matches(config.hapticSelector)) {
        triggerPrimaryHaptic()
      }
      window.setTimeout(() => el.classList.remove(config.tappedClass), TAP_MS)
    }

    root.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => root.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [rootRef, config])
}
