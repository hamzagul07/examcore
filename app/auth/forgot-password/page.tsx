'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buildSignInHref } from '@/lib/auth-redirect'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'

export default function ForgotPasswordPage() {
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
    // Reset email lands on /auth/callback with a recovery code, which exchanges
    // for a short-lived session and then forwards to /auth/reset-password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell backLabel="Back to sign in" backHref={buildSignInHref()}>
      {!sent ? (
        <>
          <p className="ec-eyebrow mb-3">Password reset</p>
          <h1 className="text-hero mb-3">
            Reset your <span className="ec-text-gradient">password</span>
          </h1>
          <p className="mb-6 leading-relaxed text-[var(--ec-text-secondary)]">
            Enter the email you signed up with and we&apos;ll send you a link to
            set a new password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              idleLabel="Send reset link"
              loadingLabel="Sending..."
            />
          </form>

          <p className="mt-6 text-center text-sm text-[var(--ec-text-secondary)]">
            Remembered it?{' '}
            <Link href={buildSignInHref()} className="ec-link">
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ec-icon-hero">
            <Mail className="h-8 w-8 ec-text-brand" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)]">
            Check your email
          </h2>
          <p className="leading-relaxed text-[var(--ec-text-secondary)]">
            If an account exists for{' '}
            <strong className="text-[var(--ec-text-primary)]">{email}</strong>, we&apos;ve sent a
            password reset link. Click it to choose a new password.
          </p>
        </div>
      )}
    </AuthShell>
  )
}
