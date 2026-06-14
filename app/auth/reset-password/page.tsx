'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  buildForgotPasswordHref,
  buildSignInHref,
  readPostAuthNextParam,
} from '@/lib/auth-redirect'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'
import { PasswordInput } from '@/components/PasswordInput'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'
import { fetchPostAuthDestination } from '@/lib/auth-post-login'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordSkeleton() {
  return (
    <AuthShell backLabel="Back to sign in" backHref={buildSignInHref()}>
      <p className="leading-relaxed text-[var(--ec-text-secondary)]">
        Checking your reset link…
      </p>
    </AuthShell>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = readPostAuthNextParam(searchParams.get('next'), null)
  const signInHref = buildSignInHref(returnTo)
  const forgotHref = buildForgotPasswordHref(returnTo)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const valid = password.length >= 8 && password === confirmPassword

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (cancelled) return
      setHasSession(Boolean(user))
      setCheckingSession(false)
    }

    void checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setErrorMsg(
        error.message.toLowerCase().includes('session')
          ? 'Your reset link expired. Request a new one from the sign-in page.'
          : error.message
      )
      return
    }

    setDone(true)
    const destination = await fetchPostAuthDestination(returnTo)
    setTimeout(() => {
      router.push(destination)
      router.refresh()
    }, 1500)
  }

  if (checkingSession) {
    return <ResetPasswordSkeleton />
  }

  if (!hasSession) {
    return (
      <AuthShell backLabel="Back to sign in" backHref={signInHref}>
        <p className="ec-eyebrow mb-3">Password reset</p>
        <h1 className="text-hero mb-3">
          Link <span className="ec-text-gradient">expired</span>
        </h1>
        <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
          Open the reset link from your email in this browser, or request a fresh
          one below.
        </p>
        <Link
          href={forgotHref}
          className="ec-btn-primary inline-flex w-full justify-center"
        >
          Request a new link
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell backLabel="Back to sign in" backHref={signInHref}>
      {!done ? (
        <>
          <p className="ec-label-tech mb-3">NEW PASSWORD</p>
          <h1 className="text-hero mb-3">
            Set a <span className="ec-text-gradient">new password</span>
          </h1>
          <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
            Pick something at least 8 characters long. You&apos;ll use this from
            now on.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="label-overline mb-2 inline-block">
                New password
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="label-overline mb-2 inline-block">
                Confirm new password
              </Label>
              <PasswordInput
                id="confirm"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
            </div>

            {errorMsg && <ErrorBox message={errorMsg} />}

            <SubmitButton
              loading={loading}
              idleLabel="Update password"
              loadingLabel="Updating..."
              disabled={!valid}
            />
          </form>

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Need a fresh link?{' '}
            <Link href={forgotHref} className="ec-link ec-auth-footer-link">
              Request another
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ec-icon-hero">
            <CheckCircle2 className="h-8 w-8 ec-score-high" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Password updated
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            Taking you to your dashboard…
          </p>
        </div>
      )}
    </AuthShell>
  )
}
