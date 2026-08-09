'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { PasswordInput } from '@/components/PasswordInput'
import {
  type AuthMethod,
  MethodTabs,
  SubmitButton,
} from '@/components/AuthFormBits'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { Field } from '@/components/ui/Field'
import { buildAuthCallbackUrl } from '@/lib/auth-oauth'
import { formatAuthError } from '@/lib/auth-errors'
import { GoogleAuthSection } from '@/components/auth/GoogleAuthSection'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { GuestBrowseSkip } from '@/components/auth/GuestBrowseSkip'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

type SignUpFormProps = {
  redirectPath: string
  signInHref: string
  signupSubhead?: string
  showBlogReturnHint?: boolean
  showContentReturnHint?: boolean
  /** When set, guests can skip signup and return to this topic for the session. */
  guestBrowseSkipPath?: string | null
}

/**
 * Shared signup form — used on /auth/signup.
 *
 * Username is deliberately not collected here (AU-01 / Codex UI review).
 * Community composers already ask for a handle on first post; forcing a public
 * identity before the first mark blocked activation for no product reason.
 */
export function SignUpForm({
  redirectPath,
  signInHref,
  signupSubhead = 'Free marks against real schemes. About 60 seconds to file your subjects after.',
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
    trackFunnelEvent('signup_started', { source: 'magic_link' })

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
      },
    })

    setLoading(false)
    if (error) {
      setErrorMsg(formatAuthError(error))
      return
    }
    trackFunnelEvent('signup_completed', { source: 'magic_link_sent' })
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
    trackFunnelEvent('signup_started', { source: 'password' })

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
      setErrorMsg(formatAuthError(error))
      return
    }

    if (!data.session) {
      trackFunnelEvent('signup_completed', { source: 'password_verify_email' })
      const params = new URLSearchParams({ email })
      if (intentDestination !== '/onboarding') {
        params.set('next', intentDestination)
      }
      router.push(`/auth/verify-email?${params.toString()}`)
      return
    }

    trackFunnelEvent('signup_completed', { source: 'password_session' })

    const afterSignup =
      intentDestination === '/onboarding'
        ? '/onboarding'
        : `/onboarding?next=${encodeURIComponent(intentDestination)}`
    router.push(afterSignup)
    router.refresh()
  }

  if (sent) {
    return (
      <div className="ms-signup-desk space-y-3">
        <span className="ec-ink-stamp ec-ink-stamp--hero mb-3" aria-hidden>
          @
        </span>
        <p className="ec-eyebrow mb-2">Inbox</p>
        <h2 className="text-hero mb-3">
          Check your <em>email</em>
        </h2>
        <p className="leading-relaxed text-[var(--ec-text-secondary)]">
          We sent a confirmation link to{' '}
          <strong className="text-[var(--ec-text-primary)]">{email}</strong>. Open it to finish
          filing your desk.
        </p>
        <p className="ms-signup-artefact__note" aria-hidden>
          the link is the stamp — open it once
        </p>
        <p className="pt-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
          Did not get it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
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
    <div className="ms-signup-desk">
      <div className="mb-2 flex items-center gap-2">
        <p className="ec-eyebrow mb-0">Marking desk</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          M1
        </span>
      </div>
      <h1 className="text-hero mb-3">
        Open your <em>marking desk</em>
      </h1>
      <p className="mb-2 leading-relaxed text-[var(--ec-text-secondary)]">{signupSubhead}</p>
      <p className="ms-signup-artefact__note mb-6" aria-hidden>
        file the account — then put ink on a script
      </p>

      {showBlogReturnHint ? (
        <p className="ms-signup-note" role="note">
          After subject setup (~60 sec), you&apos;ll land back on the guide you were reading.
        </p>
      ) : null}

      {showContentReturnHint ? (
        <p className="ms-signup-note" role="note">
          After subject setup (~60 sec), you&apos;ll return to the topic you were viewing.
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
          <Field
            label="Email"
            inputProps={{
              id: 'signup-email-magic',
              type: 'email',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              required: true,
              autoComplete: 'email',
              placeholder: 'you@example.com',
            }}
          />

          {errorMsg ? <FormErrorAlert message={errorMsg} /> : null}

          <SubmitButton
            loading={loading}
            idleLabel="Send sign-up link"
            loadingLabel="Sending..."
          />
        </form>
      ) : (
        <form onSubmit={handlePasswordSignUp} className="mt-6 space-y-4">
          <Field
            label="Email"
            inputProps={{
              id: 'signup-email-pw',
              type: 'email',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              required: true,
              autoComplete: 'email',
              placeholder: 'you@example.com',
            }}
          />
          <div>
            <label htmlFor="signup-password" className="label-overline mb-2 inline-block">
              Password
            </label>
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
            <label htmlFor="signup-confirm" className="label-overline mb-2 inline-block">
              Confirm password
            </label>
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
    return 'Free marks, real schemes — we’ll match guides to your subjects next (~60 sec).'
  }
  if (redirect?.startsWith('/courses/') || redirect?.startsWith('/past-papers/')) {
    return 'Free marks, real schemes — open this topic after a quick subject setup.'
  }
  if (redirect?.startsWith('/ib/courses/') || redirect?.startsWith('/ib/past-papers/')) {
    return 'Free marks, real schemes — open this topic after a quick subject setup.'
  }
  if (redirect?.includes('board=edexcel')) {
    return 'Free marks — save this Edexcel IAL attempt, then file your subjects.'
  }
  if (redirect?.startsWith('/mark')) {
    return 'Free marks — save this attempt, then file your board and subjects (~60 sec).'
  }
  return 'Free marks against real schemes. About 60 seconds to file your subjects after.'
}
