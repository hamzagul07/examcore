'use client'

import { Suspense, useMemo, useState } from 'react'
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

import { buildSignInHref, isSafeNextPath } from '@/lib/auth-redirect'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import {
  GoogleAuthSection,
  GoogleAuthSectionSkeleton,
} from '@/components/auth/GoogleAuthSection'
import { AuthDivider } from '@/components/auth/AuthDivider'

/**
 * Map a Command Bar `?intent=` query param to a post-signup destination.
 *
 * The Instant-Action Agent on the landing page hands visitors off with a
 * conversion intent ("mark this question", "see my diagnostic", "upload my
 * work", "see the solution"). After auth completes we want them to land in
 * the right place rather than the generic onboarding flow.
 */
function destinationForIntent(
  intent: string | null,
  topic: string | null,
  paper: string | null,
  redirect: string | null
): string {
  if (isSafeNextPath(redirect)) return redirect
  if (!intent) return '/onboarding'
  switch (intent) {
    case 'mark':
      return paper ? `/mark?paper=${encodeURIComponent(paper)}` : '/mark'
    case 'diagnostic':
      return topic ? `/mark?topic=${encodeURIComponent(topic)}` : '/mark'
    case 'upload':
      return '/mark'
    case 'solution':
      return topic ? `/dashboard?topic=${encodeURIComponent(topic)}` : '/dashboard'
    default:
      return '/onboarding'
  }
}

export default function SignUpPage() {
  // `useSearchParams` requires a Suspense boundary in app-router client pages
  // so the rest of the static tree can render while the query string resolves.
  return (
    <Suspense fallback={<SignUpFormSkeleton />}>
      <SignUpForm />
    </Suspense>
  )
}

function SignUpFormSkeleton() {
  return (
    <AuthShell backLabel="Back to sign in" backHref="/auth/signin">
      <p className="ec-eyebrow mb-3">Get started</p>
      <h1 className="text-hero mb-3">
        Create your <span className="ec-text-gradient">account</span>
      </h1>
      <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
        Free tier included — start marking in under a minute.
      </p>
      <GoogleAuthSectionSkeleton label="Sign up with Google" />
    </AuthShell>
  )
}

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')
  const topic = searchParams.get('topic')
  const paper = searchParams.get('paper')
  const redirect = searchParams.get('redirect')

  // Cached so we don't recompute on every render. `intent`/`topic`/`paper` are
  // stable for the page lifetime.
  const intentDestination = useMemo(
    () => destinationForIntent(intent, topic, paper, redirect),
    [intent, topic, paper, redirect]
  )

  const signInHref = useMemo(
    () =>
      buildSignInHref(
        intentDestination !== '/onboarding' ? intentDestination : null
      ),
    [intentDestination]
  )

  const [method, setMethod] = useState<AuthMethod>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const passwordsMatch =
    password.length === 0 || confirmPassword.length === 0 || password === confirmPassword
  const passwordValid = password.length >= 8
  const canSubmitPassword = passwordValid && password === confirmPassword

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    // Pipe the Command Bar `intent` through the magic-link callback so that
    // after the user clicks the email we can route them straight to /mark,
    // /dashboard, etc. instead of the generic onboarding step.
    const callbackUrl = buildAuthCallbackUrl(
      window.location.origin,
      intentDestination !== '/onboarding' ? intentDestination : null
    )

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: true,
      },
    })

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setSent(true)
  }

  async function handlePasswordSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    if (!passwordValid) {
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
    const callbackUrl =
      intentDestination !== '/onboarding'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(intentDestination)}`
        : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }

    // If Supabase has "Confirm email" enabled, the user receives a verification
    // email and `data.session` is null. We surface the same "check your email"
    // state. If email confirmation is OFF, the user is signed in immediately.
    if (!data.session) {
      const params = new URLSearchParams({ email })
      if (intentDestination !== '/onboarding') {
        params.set('next', intentDestination)
      }
      router.push(`/auth/verify-email?${params.toString()}`)
      return
    }

    const afterSignup =
      intentDestination === '/onboarding'
        ? '/onboarding'
        : `/onboarding?next=${encodeURIComponent(intentDestination)}`
    router.push(afterSignup)
    router.refresh()
  }

  return (
    <AuthShell backLabel="Back to sign in" backHref={signInHref}>
      {!sent ? (
        <>
          <p className="ec-eyebrow mb-3">Get started</p>
          <h1 className="text-hero mb-3">
            Create your <span className="ec-text-gradient">account</span>
          </h1>
          <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
            Free tier included — start marking in under a minute.
          </p>

          <GoogleAuthSection
            label="Sign up with Google"
            redirectPath={null}
            disabled={loading}
            onError={setErrorMsg}
            hint="School or personal Google — we’ll set up your subjects next."
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
                idleLabel="Send sign-up link"
                loadingLabel="Sending..."
              />
            </form>
          ) : (
            <form onSubmit={handlePasswordSignUp} className="mt-6 space-y-4">
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
                  autoComplete="new-password"
                  minLength={8}
                />
                <p
                  className={`mt-1.5 text-xs ${
                    password.length === 0
                      ? 'text-[var(--ec-text-secondary)]'
                      : passwordValid
                      ? 'ec-score-high'
                      : 'ec-score-mid'
                  }`}
                >
                  {password.length === 0
                    ? 'At least 8 characters.'
                    : passwordValid
                    ? 'Looks good.'
                    : `${password.length} / 8 characters.`}
                </p>
              </div>
              <div>
                <Label htmlFor="confirm" className="label-overline mb-2 inline-block">
                  Confirm password
                </Label>
                <PasswordInput
                  id="confirm"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
                {!passwordsMatch && (
                  <p className="mt-1.5 text-xs ec-score-low">
                    Passwords don&apos;t match.
                  </p>
                )}
              </div>

              {errorMsg && <ErrorBox message={errorMsg} />}

              <SubmitButton
                loading={loading}
                idleLabel="Create account"
                loadingLabel="Creating account..."
                disabled={!canSubmitPassword}
              />
            </form>
          )}

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Already have an account?{' '}
            <Link href={signInHref} className="ec-link">
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border ec-tint-brand-icon">
            <Mail className="h-8 w-8 ec-text-brand" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Check your email
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            We sent a confirmation link to{' '}
            <strong className="text-[var(--ec-text-primary)]">{email}</strong>. Click it to finish
            setting up your account.
          </p>
        </div>
      )}
    </AuthShell>
  )
}
