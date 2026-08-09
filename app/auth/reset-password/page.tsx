'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  buildForgotPasswordHref,
  buildSignInHref,
  readPostAuthNextParam,
} from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'
import { PasswordInput } from '@/components/PasswordInput'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'
import { fetchPostAuthDestination } from '@/lib/auth-post-login'
import { formatAuthError } from '@/lib/auth-errors'
import { SignupDeskArtefact } from '@/components/auth/SignupDeskArtefact'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordSkeleton() {
  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={buildSignInHref()}
      aside={<SignupDeskArtefact variant="reset" />}
    >
      <div className="ms-signup-desk">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">New password</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            PW
          </span>
        </div>
        <p className="leading-relaxed text-[var(--ec-text-secondary)]">
          Checking your reset link…
        </p>
      </div>
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
          : formatAuthError(error)
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
      <AuthShell
        backLabel="Back to sign in"
        backHref={signInHref}
        aside={<SignupDeskArtefact variant="reset" />}
      >
        <div className="ms-signup-desk">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Password reset</p>
            <span
              className="ec-ink-stamp ec-ink-stamp--inline ec-ink-stamp--crimson"
              aria-hidden
            >
              X
            </span>
          </div>
          <h1 className="text-hero mb-3">
            Link <em>expired</em>
          </h1>
          <p className="mb-2 leading-relaxed text-[var(--ec-text-secondary)]">
            Open the reset link from your email in this browser, or request a fresh
            one below.
          </p>
          <p className="ms-signup-note mb-6" aria-hidden>
            links expire — that&apos;s the point
          </p>
          <Link
            href={forgotHref}
            className="ec-btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            Request a new link
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              -&gt;
            </span>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={signInHref}
      aside={done ? null : <SignupDeskArtefact variant="reset" />}
    >
      {!done ? (
        <div className="ms-signup-desk">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">New password</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              PW
            </span>
          </div>
          <h1 className="text-hero mb-3">
            Set a <em>new password</em>
          </h1>
          <p className="mb-2 leading-relaxed text-[var(--ec-text-secondary)]">
            At least 8 characters. You&apos;ll use this from now on.
          </p>
          <p className="ms-signup-note mb-6" aria-hidden>
            file the new key — then the desk opens
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
        </div>
      ) : (
        <div className="ms-signup-desk space-y-3">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Filed</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
          </div>
          <h2 className="text-hero mb-3">
            Password <em>updated</em>
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            Taking you back to your desk…
          </p>
          <p className="ms-signup-note" aria-hidden>
            key filed — desk unlocking
          </p>
        </div>
      )}
    </AuthShell>
  )
}
