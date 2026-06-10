'use client'

import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import { cn } from '@/lib/utils'

type ThemeFlipProps = {
  className?: string
}

/** Single-button paper ↔ night toggle (prototype theme-flip). */
export function ThemeFlip({ className }: ThemeFlipProps) {
  const { theme, toggleTheme } = useEcTheme()
  const isPaper = theme === 'zen'

  return (
    <button
      type="button"
      className={cn('ec-theme-flip', className)}
      onClick={() => {
        triggerPrimaryHaptic()
        toggleTheme()
      }}
      title={isPaper ? 'Switch to night mode' : 'Switch to paper mode'}
      aria-label={isPaper ? 'Switch to night mode' : 'Switch to paper mode'}
    >
      {isPaper ? '☾' : '☀'}
    </button>
  )
}
