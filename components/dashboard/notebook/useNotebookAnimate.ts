'use client'

import { useLayoutEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const SESSION_KEY = 'ec-notebook-drawn'

/**
 * One-shot draw-in per browser session. Respects prefers-reduced-motion.
 * Returns `ready` so marks can remount once session state is known (avoids hydration flash).
 */
export function useNotebookAnimate(): { animate: boolean; ready: boolean } {
  const reduce = useReducedMotion()
  const [state, setState] = useState({ animate: false, ready: false })

  useLayoutEffect(() => {
    if (reduce) {
      setState({ animate: false, ready: true })
      return
    }

    try {
      const drawn = sessionStorage.getItem(SESSION_KEY) === '1'
      if (!drawn) sessionStorage.setItem(SESSION_KEY, '1')
      setState({ animate: !drawn, ready: true })
    } catch {
      setState({ animate: true, ready: true })
    }
  }, [reduce])

  return state
}
