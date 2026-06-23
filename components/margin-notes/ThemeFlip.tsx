'use client'

import { useEffect, useState } from 'react'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import { cn } from '@/lib/utils'

type ThemeFlipProps = {
  className?: string
}

/** Single-button paper ↔ night toggle (prototype theme-flip). */
export function ThemeFlip({ className }: ThemeFlipProps) {
  const { theme, toggleTheme } = useEcTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isPaper = theme === 'zen'
  const label = isPaper ? 'Switch to night mode' : 'Switch to paper mode'
  const icon = isPaper ? '☾' : '☀'

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
      {mounted ? icon : '◐'}
    </button>
  )
}
