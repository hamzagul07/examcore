'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <AuthShell backLabel="Back to sign in" backHref="/auth/signin">
      {!sent ? (
        <>
          <p className="ec-label-tech mb-3">PASSWORD RESET</p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Reset your <span className="ec-text-gradient">password</span>
          </h1>
          <p className="mb-6 leading-relaxed text-slate-400">
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

          <p className="mt-6 text-center text-sm text-slate-400">
            Remembered it?{' '}
            <Link
              href="/auth/signin"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Check your email
          </h2>
          <p className="leading-relaxed text-slate-400">
            If an account exists for{' '}
            <strong className="text-white">{email}</strong>, we&apos;ve sent a
            password reset link. Click it to choose a new password.
          </p>
        </div>
      )}
    </AuthShell>
  )
}
