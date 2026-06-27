'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/PasswordInput'
import {
  type AuthMethod,
  MethodTabs,
  SubmitButton,
} from '@/components/AuthFormBits'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import { GoogleAuthSection } from '@/components/auth/GoogleAuthSection'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { UsernameField, type UsernameState } from '@/components/auth/UsernameField'
import { GuestBrowseSkip } from '@/components/auth/GuestBrowseSkip'

type SignUpFormProps = {
  redirectPath: string
  signInHref: string
  signupSubhead?: string
  showBlogReturnHint?: boolean
  showContentReturnHint?: boolean
  /** When set, guests can skip signup and return to this topic for the session. */
  guestBrowseSkipPath?: string | null
}

/** Shared signup form — used on /auth/signup. */
export function SignUpForm({
  redirectPath,
  signInHref,
  signupSubhead = 'Free tier included — Cambridge or IB Diploma, pick your subjects in onboarding.',
  showBlogReturnHint = false,
  showContentReturnHint = false,
  guestBrowseSkipPath = null,
}: SignUpFormProps) {
  const router = useRouter()
  const intentDestination = redirectPath

  const [method, setMethod] = useState<AuthMethod>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState<UsernameState>({ value: '', valid: false })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const passwordsMatch =
    password.length === 0 || confirmPassword.length === 0 || password === confirmPassword
  const passwordValid = password.length >= 8
  const canSubmitPassword = passwordValid && password === confirmPassword && username.valid

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    if (!username.valid) {
      setErrorMsg('Pick an available username.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const callbackUrl = buildAuthCallbackUrl(
      window.location.origin,
      intentDestination !== '/onboarding' ? intentDestination : null
    )

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: true,
        data: { username: username.value },
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
    if (!username.valid) {
      setErrorMsg('Pick an available username.')
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
        data: { username: username.value },
      },
    })

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (!data.session) {
      const params = new URLSearchParams({ email })
      if (intentDestination !== '/onboarding') {
        params.set('next', intentDestination)
      }
      router.push(`/auth/verify-email?${params.toString()}`)
      return
    }

    try {
      await fetch('/api/community/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value }),
      })
    } catch {
      // Non-fatal — onboarding reconciles from user_metadata as a fallback.
    }

    const afterSignup =
      intentDestination === '/onboarding'
        ? '/onboarding'
        : `/onboarding?next=${encodeURIComponent(intentDestination)}`
    router.push(afterSignup)
    router.refresh()
  }

  if (sent) {
    return (
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
        <p className="pt-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
          Did not get it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
            className="ec-link ec-auth-link underline"
          >
            try again
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="ec-eyebrow mb-3">Get started</p>
      <h1 className="text-hero mb-3">
        Create your <span className="ec-text-gradient">account</span>
      </h1>
      <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">{signupSubhead}</p>

      {showBlogReturnHint ? (
        <p
          className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--ec-brand)_24%,var(--ec-border))] bg-[color-mix(in_srgb,var(--ec-brand)_6%,var(--ec-surface))] px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
          role="note"
        >
          After a quick subject setup (~60 sec), you&apos;ll land back on the guide you were
          reading.
        </p>
      ) : null}

      {showContentReturnHint ? (
        <p
          className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--ec-brand)_24%,var(--ec-border))] bg-[color-mix(in_srgb,var(--ec-brand)_6%,var(--ec-surface))] px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
          role="note"
        >
          After a quick subject setup (~60 sec), you&apos;ll return to the topic you were viewing.
        </p>
      ) : null}

      <GoogleAuthSection
        label="Sign up with Google"
        redirectPath={intentDestination}
        disabled={loading}
        onError={setErrorMsg}
        hint="School or personal Google — we’ll set up your subjects next."
      />

      <AuthDivider label="or continue with email" />

      <MethodTabs method={method} setMethod={setMethod} setError={setErrorMsg} />

      {method === 'magic' ? (
        <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="signup-email-magic" className="label-overline mb-2 inline-block">
              Email
            </Label>
            <input
              id="signup-email-magic"
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
            <Label htmlFor="signup-username-magic" className="label-overline mb-2 inline-block">
              Username
            </Label>
            <UsernameField
              id="signup-username-magic"
              value={username.value}
              onChange={setUsername}
            />
          </div>

          {errorMsg ? <FormErrorAlert message={errorMsg} /> : null}

          <SubmitButton
            loading={loading}
            idleLabel="Send sign-up link"
            loadingLabel="Sending..."
            disabled={!username.valid}
          />
        </form>
      ) : (
        <form onSubmit={handlePasswordSignUp} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="signup-email-pw" className="label-overline mb-2 inline-block">
              Email
            </Label>
            <input
              id="signup-email-pw"
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
            <Label htmlFor="signup-username-pw" className="label-overline mb-2 inline-block">
              Username
            </Label>
            <UsernameField id="signup-username-pw" value={username.value} onChange={setUsername} />
          </div>
          <div>
            <Label htmlFor="signup-password" className="label-overline mb-2 inline-block">
              Password
            </Label>
            <PasswordInput
              id="signup-password"
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
            <Label htmlFor="signup-confirm" className="label-overline mb-2 inline-block">
              Confirm password
            </Label>
            <PasswordInput
              id="signup-confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {!passwordsMatch ? (
              <p className="mt-1.5 text-xs ec-score-low">Passwords don&apos;t match.</p>
            ) : null}
          </div>

          {errorMsg ? <FormErrorAlert message={errorMsg} /> : null}

          <SubmitButton
            loading={loading}
            idleLabel="Create account"
            loadingLabel="Creating account..."
            disabled={!canSubmitPassword}
          />
        </form>
      )}

      {guestBrowseSkipPath ? (
        <GuestBrowseSkip returnPath={guestBrowseSkipPath} className="mt-5 w-full" />
      ) : null}

      <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
        Already have an account?{' '}
        <Link href={signInHref} className="ec-link ec-auth-footer-link">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export function signUpSubheadForRedirect(redirect: string | null): string {
  if (redirect?.startsWith('/blog/')) {
    return 'Free tier included — we’ll match guides to your subjects in the next step.'
  }
  if (redirect?.startsWith('/courses/') || redirect?.startsWith('/past-papers/')) {
    return 'Free tier included — create your account to open this topic and save progress.'
  }
  if (redirect?.startsWith('/ib/courses/') || redirect?.startsWith('/ib/past-papers/')) {
    return 'Free tier included — create your account to open this topic and save progress.'
  }
  return 'Free tier included — Cambridge or IB Diploma, pick your subjects in onboarding.'
}
