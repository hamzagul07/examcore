'use client'

import { Moon, Sun } from 'lucide-react'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'

export function ThemeSwitcher() {
  const { theme, setTheme } = useEcTheme()

  function select(next: 'late-night' | 'zen') {
    triggerPrimaryHaptic()
    setTheme(next)
  }

  return (
    <div
      className="flex items-center gap-1 rounded-xl p-1"
      style={{
        background: 'var(--ec-surface)',
        border: '1px solid var(--ec-border)',
      }}
      role="group"
      aria-label="Theme mode"
    >
      <button
        type="button"
        title="Late Night"
        onClick={() => select('late-night')}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-300 active:scale-[0.98] md:px-3"
        style={{
          background:
            theme === 'late-night' ? 'var(--ec-brand-muted)' : 'transparent',
          color:
            theme === 'late-night'
              ? 'var(--ec-brand)'
              : 'var(--ec-text-secondary)',
        }}
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Late Night</span>
      </button>
      <button
        type="button"
        title="Zen"
        onClick={() => select('zen')}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-300 active:scale-[0.98] md:px-3"
        style={{
          background: theme === 'zen' ? 'var(--ec-brand-muted)' : 'transparent',
          color:
            theme === 'zen' ? 'var(--ec-brand)' : 'var(--ec-text-secondary)',
        }}
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Zen</span>
      </button>
    </div>
  )
}
