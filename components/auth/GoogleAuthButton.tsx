'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'

type Props = {
  /** Shown on the button — sign-in vs sign-up is the same OAuth flow. */
  label: string
  /** Safe in-app path after auth (e.g. /mark, /onboarding). */
  redirectPath?: string | null
  disabled?: boolean
  onError?: (message: string) => void
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function GoogleAuthButton({
  label,
  redirectPath,
  disabled,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    if (typeof window === 'undefined') return
    setLoading(true)
    onError?.('')

    const supabase = createClient()
    const redirectTo = buildAuthCallbackUrl(window.location.origin, redirectPath)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setLoading(false)
      onError?.(error.message)
    }
    // Success redirects away — keep loading state.
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={() => void handleGoogle()}
      className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)] px-4 py-3 text-sm font-semibold text-[var(--ec-text-primary)] transition-colors hover:border-[var(--ec-border-strong,var(--ec-border))] hover:bg-[var(--ec-surface-raised)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ec-text-secondary)]" />
          Connecting to Google…
        </>
      ) : (
        <>
          <GoogleIcon />
          {label}
        </>
      )}
    </button>
  )
}
