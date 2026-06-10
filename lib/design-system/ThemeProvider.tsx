'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  EC_THEME_STORAGE_KEY,
  type EcTheme,
} from '@/lib/design-system/tokens'

interface ThemeContextValue {
  theme: EcTheme
  setTheme: (theme: EcTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): EcTheme {
  if (typeof window === 'undefined') return 'zen'
  const stored = localStorage.getItem(EC_THEME_STORAGE_KEY)
  return stored === 'late-night' ? 'late-night' : 'zen'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<EcTheme>('zen')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    document.documentElement.setAttribute('data-ec-theme', stored)
    setMounted(true)
  }, [])

  const setTheme = useCallback((next: EcTheme) => {
    setThemeState(next)
    document.documentElement.setAttribute('data-ec-theme', next)
    localStorage.setItem(EC_THEME_STORAGE_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'late-night' ? 'zen' : 'late-night')
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: 'zen', setTheme, toggleTheme }}
      >
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useEcTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useEcTheme must be used within ThemeProvider')
  }
  return ctx
}
