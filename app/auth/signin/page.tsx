'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'
import { PasswordInput } from '@/components/PasswordInput'
import {
  type AuthMethod,
  MethodTabs,
  ErrorBox,
  SubmitButton,
} from '@/components/AuthFormBits'
import { buildSignUpHref, buildForgotPasswordHref } from '@/lib/auth-redirect'
import { fetchPostAuthDestination } from '@/lib/auth-post-login'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import {
  GoogleAuthSection,
  GoogleAuthSectionSkeleton,
} from '@/components/auth/GoogleAuthSection'
import { AuthDivider } from '@/components/auth/AuthDivider'

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
    <AuthShell>
      <p className="ec-eyebrow mb-3">Welcome back</p>
      <h1 className="text-hero mb-3">
        Sign in to <span className="ec-text-gradient">MarkScheme</span>
      </h1>
      <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
        Pick up where you left off — mark papers and track progress.
      </p>
      <GoogleAuthSectionSkeleton label="Continue with Google" />
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
      setErrorMsg(error.message)
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
      setErrorMsg(error.message)
      return
    }

    const destination = await fetchPostAuthDestination(nextParam)
    router.push(destination)
    router.refresh()
  }

  const signupHref = buildSignUpHref(nextParam)
  const forgotHref = buildForgotPasswordHref(nextParam)

  return (
    <AuthShell>
      {!sent ? (
        <>
          <p className="ec-eyebrow mb-3">Welcome back</p>
          <h1 className="text-hero mb-3">
            Sign in to <span className="ec-text-gradient">MarkScheme</span>
          </h1>
          {profileSaved ? (
            <div className="ec-banner ec-banner-info mb-6">
              <p className="ec-banner__title">Profile saved — one more sign-in</p>
              <p className="ec-banner__meta mt-1">
                Your subjects and settings are ready. Sign in below to continue to{' '}
                {nextParam === '/mark' ? 'marking' : 'your destination'}.
              </p>
            </div>
          ) : null}

          <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
            {profileSaved
              ? 'Use the same method you signed up with.'
              : 'Pick up where you left off — mark papers and track progress.'}
          </p>

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
              <div>
                <Label htmlFor="email" className="label-overline mb-2 inline-block">
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="ec-input"
                />
              </div>

              {errorMsg && <ErrorBox message={errorMsg} />}

              <SubmitButton
                loading={loading}
                idleLabel="Send magic link"
                loadingLabel="Sending magic link..."
              />
            </form>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="label-overline mb-2 inline-block">
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="ec-input"
                />
              </div>
              <div>
                <Label htmlFor="password" className="label-overline mb-2 inline-block">
                  Password
                </Label>
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

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="ec-link ec-auth-footer-link">
              Sign up
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ec-icon-hero">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Check your email
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            We sent a magic link to{' '}
            <strong className="text-[var(--ec-text-primary)]">{email}</strong>. Click it to sign in.
          </p>
          <p className="pt-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
            Did not get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
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
