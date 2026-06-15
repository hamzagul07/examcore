'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

const STORAGE_KEY = 'course-focus-mode'

function readStoredFocus(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function CourseFocusMode({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    setFocus(readStoredFocus())
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (focus) {
      document.documentElement.setAttribute('data-course-focus', 'true')
    } else {
      document.documentElement.removeAttribute('data-course-focus')
    }
    return () => {
      document.documentElement.removeAttribute('data-course-focus')
    }
  }, [focus])

  const toggle = useCallback(() => {
    setFocus((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const label = focus ? 'Exit focus mode' : 'Enter focus mode'

  return (
    <div className="course-focus-root" data-focus-mode={focus ? 'true' : 'false'}>
      <button
        type="button"
        className="course-focus-fab hidden md:inline-flex"
        onClick={toggle}
        aria-pressed={focus}
        aria-label={`${label} (Ctrl+.)`}
        title={`${label} — Ctrl+.`}
      >
        {focus ? (
          <Minimize2 className="h-5 w-5" aria-hidden />
        ) : (
          <Maximize2 className="h-5 w-5" aria-hidden />
        )}
      </button>
      {children}
    </div>
  )
}
