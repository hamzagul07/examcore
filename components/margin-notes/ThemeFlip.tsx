'use client'

import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import type { EcTheme } from '@/lib/design-system/tokens'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import { cn } from '@/lib/utils'

type ThemeFlipProps = {
  className?: string
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

/* The theme lives on <html data-ec-theme>. The boot script stamps it before
   hydration and ThemeProvider updates it (inside a view transition, so a
   frame later than its own state). Subscribing to the attribute keeps the
   icon honest in both cases. */
function subscribeToDomTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-ec-theme'],
  })
  return () => observer.disconnect()
}

function readDomTheme(): EcTheme {
  return document.documentElement.getAttribute('data-ec-theme') === 'late-night'
    ? 'late-night'
    : 'zen'
}

function readServerTheme(): EcTheme {
  return 'zen'
}

/**
 * Single-button paper ↔ night toggle. The icon shows the mode you would
 * switch TO (moon on paper, sun at night) and morphs between the two: the
 * sun's disc is eclipsed into a crescent by a sliding mask while the rays
 * fold away.
 *
 * The provider hydrates as `zen` and corrects itself in an effect that runs
 * after this component's own, so late-night users used to see the moon flip
 * to a sun on every load. The icon now follows the attribute on <html>
 * directly: before hydration it is a plain disc, and resolves into the
 * right glyph once the client knows the theme.
 */
export function ThemeFlip({ className }: ThemeFlipProps) {
  const { toggleTheme } = useEcTheme()
  const [mounted, setMounted] = useState(false)
  const maskId = useId()
  const current = useSyncExternalStore(subscribeToDomTheme, readDomTheme, readServerTheme)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isPaper = current === 'zen'
  const label = isPaper ? 'Switch to night mode' : 'Switch to paper mode'

  return (
    <button
      type="button"
      className={cn('ec-theme-flip', className)}
      onClick={() => {
        triggerPrimaryHaptic()
        toggleTheme()
      }}
      title={mounted ? label : 'Toggle theme'}
      aria-label={mounted ? label : 'Toggle theme'}
      suppressHydrationWarning
    >
      <svg
        className="ec-theme-flip__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
        data-mode={mounted ? (isPaper ? 'moon' : 'sun') : 'pending'}
      >
        <mask id={`${maskId}-eclipse`}>
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <circle className="ec-theme-flip__mask" cx="12" cy="12" r="6" fill="#000" />
        </mask>
        <circle
          className="ec-theme-flip__disc"
          cx="12"
          cy="12"
          r="5.5"
          fill="currentColor"
          mask={`url(#${maskId}-eclipse)`}
        />
        <g
          className="ec-theme-flip__rays"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {RAYS.map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="2.2"
              x2="12"
              y2="4.6"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </g>
      </svg>
    </button>
  )
}
