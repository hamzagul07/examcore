'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { AuthShell } from '@/components/AuthShell'
import { PasswordInput } from '@/components/PasswordInput'
import {
  type AuthMethod,
  MethodTabs,
  ErrorBox,
  SubmitButton,
} from '@/components/AuthFormBits'
import { Field } from '@/components/ui/Field'
import { buildSignUpHref, buildForgotPasswordHref } from '@/lib/auth-redirect'
import { formatAuthError } from '@/lib/auth-errors'
import { isContentGateReturnPath } from '@/lib/content-gate'
import { fetchPostAuthDestination } from '@/lib/auth-post-login'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import {
  GoogleAuthSection,
  GoogleAuthSectionSkeleton,
} from '@/components/auth/GoogleAuthSection'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { GuestBrowseSkip } from '@/components/auth/GuestBrowseSkip'
import { SignupDeskArtefact } from '@/components/auth/SignupDeskArtefact'

const AUTH_CALLBACK_ERRORS: Record<string, string> = {
  missing_code: 'That sign-in link is invalid or expired. Request a new one.',
  auth_failed: 'We could not complete sign-in. Try again or use password sign-in.',
  session_lost: 'Your session could not be established. Please sign in again.',
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SignInForm />
    </Suspense>
  )
}

function SignInSkeleton() {
  return (
    <AuthShell aside={<SignupDeskArtefact variant="signin" />}>
      <div className="ms-signup-desk">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">Marking desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
        </div>
        <p className="text-hero mb-3" aria-hidden="true">
          Return to your <em>desk</em>
        </p>
        <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
          Pick up marking and progress where you left off.
        </p>
        <GoogleAuthSectionSkeleton label="Continue with Google" />
      </div>
    </AuthShell>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const profileSaved = searchParams.get('completed') === '1'

  const [method, setMethod] = useState<AuthMethod>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = searchParams.get('error')
    const detail = searchParams.get('detail')
    if (code && AUTH_CALLBACK_ERRORS[code]) {
      const base = AUTH_CALLBACK_ERRORS[code]
      setErrorMsg(
        detail && code === 'auth_failed'
          ? `${base} (${detail.slice(0, 120)})`
          : base
      )
    }
  }, [searchParams])

  function callbackUrl(): string {
    return buildAuthCallbackUrl(window.location.origin, nextParam)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    })

    setLoading(false)
    if (error) {
      setErrorMsg(formatAuthError(error))
      return
    }
    setSent(true)
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      setErrorMsg(formatAuthError(error))
      return
    }

    const destination = await fetchPostAuthDestination(nextParam)
    router.push(destination)
    router.refresh()
    // Keep the spinner while navigating, but recover if navigation stalls so
    // the user isn't stuck on a dead "Signing in…" button.
    setTimeout(() => setLoading(false), 8000)
  }

  const signupHref = buildSignUpHref(nextParam)
  const forgotHref = buildForgotPasswordHref(nextParam)
  const contentGateReturn = isContentGateReturnPath(nextParam) ? nextParam : null

  return (
    <AuthShell aside={sent ? null : <SignupDeskArtefact variant="signin" />}>
      {!sent ? (
        <div className="ms-signup-desk">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Marking desk</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
          </div>
          <h1 className="text-hero mb-3">
            Return to your <em>desk</em>
          </h1>
          {profileSaved ? (
            <p className="ms-signup-note" role="status">
              Profile filed — one more sign-in to open{' '}
              {nextParam === '/mark' ? 'marking' : 'your destination'}. Use the same
              method you signed up with.
            </p>
          ) : (
            <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
              Pick up marking and progress where you left off.
            </p>
          )}

          <GoogleAuthSection
            label="Continue with Google"
            redirectPath={nextParam}
            disabled={loading}
            onError={setErrorMsg}
          />

          <AuthDivider label="or continue with email" />

          <MethodTabs method={method} setMethod={setMethod} setError={setErrorMsg} />

          {method === 'magic' ? (
            <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
              <Field
                label="Email"
                inputProps={{
                  id: 'email',
                  type: 'email',
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true,
                  autoComplete: 'email',
                  placeholder: 'you@example.com',
                }}
              />

              {errorMsg && <ErrorBox message={errorMsg} />}

              <SubmitButton
                loading={loading}
                idleLabel="Send email link"
                loadingLabel="Sending link..."
              />
            </form>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-4">
              <Field
                label="Email"
                inputProps={{
                  id: 'email',
                  type: 'email',
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true,
                  autoComplete: 'email',
                  placeholder: 'you@example.com',
                }}
              />
              <div>
                <label htmlFor="password" className="label-overline mb-2 inline-block">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
                <div className="mt-2 text-right">
                  <Link
                    href={forgotHref}
                    className="ec-auth-link text-xs ec-link"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {errorMsg && <ErrorBox message={errorMsg} />}

              <SubmitButton
                loading={loading}
                idleLabel="Sign in"
                loadingLabel="Signing in..."
              />
            </form>
          )}

          {contentGateReturn ? (
            <GuestBrowseSkip returnPath={contentGateReturn} className="mt-5 w-full" />
          ) : null}

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="ec-link ec-auth-footer-link">
              Open a desk
            </Link>
          </p>
        </div>
      ) : (
        <div className="ms-signup-desk space-y-3">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Inbox</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              @
            </span>
          </div>
          <h2 className="text-hero mb-3">
            Check your <em>email</em>
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            We sent a sign-in link to{' '}
            <strong className="text-[var(--ec-text-primary)]">{email}</strong>. Open it to
            return to your desk.
          </p>
          <p className="ms-signup-note" aria-hidden>
            same inbox you used to open the desk
          </p>
          <p className="pt-2 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
            Did not get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="ec-link underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      )}
    </AuthShell>
  )
}
