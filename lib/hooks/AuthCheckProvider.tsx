'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

export type AuthCheckUser = {
  id: string
  email?: string
  name?: string
}

type AuthCheckResponse = {
  user?: AuthCheckUser | null
  onboarded?: boolean
  role?: 'student' | 'teacher'
}

type AuthCheckState = {
  user: AuthCheckUser | null
  onboarded: boolean
  /** Which home this account has: a teacher's is their classrooms. */
  role: 'student' | 'teacher'
  loading: boolean
}

const AuthCheckContext = createContext<AuthCheckState>({
  user: null,
  onboarded: false,
  role: 'student',
  loading: true,
})

/** One shared auth probe per page — avoids duplicate /api/auth/check calls. */
export function AuthCheckProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<AuthCheckState>({
    user: null,
    onboarded: false,
    role: 'student',
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true }))

    void fetch('/api/auth/check', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : { user: null, onboarded: false }))
      .then((data: AuthCheckResponse) => {
        if (cancelled) return
        setState({
          user: data.user ?? null,
          onboarded: data.onboarded === true,
          role: data.role === 'teacher' ? 'teacher' : 'student',
          loading: false,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setState({ user: null, onboarded: false, role: 'student', loading: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <AuthCheckContext.Provider value={state}>{children}</AuthCheckContext.Provider>
  )
}

export function useAuthCheck(): AuthCheckState {
  return useContext(AuthCheckContext)
}

export function avatarInitial(user: AuthCheckUser | null): string | null {
  if (!user) return null
  const label = user.name?.trim() || user.email?.trim()
  return label ? label.charAt(0).toUpperCase() : '?'
}
