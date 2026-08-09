'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  buildResetPasswordCallbackUrl,
  buildSignInHref,
  readPostAuthNextParam,
} from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'
import { Field } from '@/components/ui/Field'
import { formatAuthError } from '@/lib/auth-errors'
import { SignupDeskArtefact } from '@/components/auth/SignupDeskArtefact'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordSkeleton() {
  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={buildSignInHref()}
      aside={<SignupDeskArtefact variant="reset" />}
    >
      <div className="ms-signup-desk">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">Password reset</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            PW
          </span>
        </div>
        <p className="text-hero mb-3" aria-hidden="true">
          Reset your <em>password</em>
        </p>
        <p className="leading-relaxed text-[var(--ec-text-secondary)]">Loading...</p>
      </div>
    </AuthShell>
  )
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const returnTo = readPostAuthNextParam(searchParams.get('next'), null)
  const signInHref = buildSignInHref(returnTo)

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid email address.')
      return
    }
    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const redirectTo = buildResetPasswordCallbackUrl(
      window.location.origin,
      returnTo
    )

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setLoading(false)
    if (error) {
      setErrorMsg(formatAuthError(error))
      return
    }
    setSent(true)
  }

  return (
    <AuthShell
      backLabel="Back to sign in"
      backHref={signInHref}
      aside={sent ? null : <SignupDeskArtefact variant="reset" />}
    >
      {!sent ? (
        <div className="ms-signup-desk">
          <div className="mb-2 flex items-center gap-2">
            <p className="ec-eyebrow mb-0">Password reset</p>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              PW
            </span>
          </div>
          <h1 className="text-hero mb-3">
            Reset your <em>password</em>
          </h1>
          <p className="mb-2 leading-relaxed text-[var(--ec-text-secondary)]">
            Enter the email you signed up with — we&apos;ll send a link to set a
            new one.
          </p>
          <p className="ms-signup-note mb-6" aria-hidden>
            same email that opened the desk
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              idleLabel="Send reset link"
              loadingLabel="Sending..."
            />
          </form>

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Remembered it?{' '}
            <Link href={signInHref} className="ec-link ec-auth-footer-link">
              Return to desk
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
            If an account exists for{' '}
            <strong className="text-[var(--ec-text-primary)]">{email}</strong>, we&apos;ve
            sent a reset link. Open it to choose a new password.
          </p>
          <p className="ms-signup-note" aria-hidden>
            open the link in this browser
          </p>
          <p className="pt-2 text-sm text-[var(--ec-text-secondary)]">
            <Link href={signInHref} className="ec-link ec-auth-footer-link">
              Return to desk
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  )
}
