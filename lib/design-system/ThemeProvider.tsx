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

function marginNotesTheme(ec: EcTheme): 'paper' | 'night' {
  return ec === 'late-night' ? 'night' : 'paper'
}

function applyThemeAttributes(ec: EcTheme) {
  const root = document.documentElement
  const apply = () => {
    root.setAttribute('data-ec-theme', ec)
    root.setAttribute('data-theme', marginNotesTheme(ec))
  }

  // Soft cross-fade between themes via the View Transitions API. Skipped when
  // the theme is unchanged (initial hydrate) or the user prefers reduced motion.
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => unknown
  }
  if (
    root.getAttribute('data-ec-theme') === ec ||
    typeof doc.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    apply()
    return
  }
  doc.startViewTransition(apply)
}

function readStoredTheme(): EcTheme {
  if (typeof window === 'undefined') return 'zen'
  const fromDom = document.documentElement.getAttribute('data-ec-theme')
  if (fromDom === 'late-night' || fromDom === 'zen') return fromDom
  const stored = localStorage.getItem(EC_THEME_STORAGE_KEY)
  return stored === 'late-night' ? 'late-night' : 'zen'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always match SSR first paint (zen); boot script + useEffect apply stored theme after hydrate.
  const [theme, setThemeState] = useState<EcTheme>('zen')

  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    applyThemeAttributes(stored)
  }, [])

  const setTheme = useCallback((next: EcTheme) => {
    setThemeState(next)
    applyThemeAttributes(next)
    localStorage.setItem(EC_THEME_STORAGE_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'late-night' ? 'zen' : 'late-night'
      applyThemeAttributes(next)
      localStorage.setItem(EC_THEME_STORAGE_KEY, next)
      return next
    })
  }, [])

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
