'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'
import { PasswordInput } from '@/components/PasswordInput'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const valid = password.length >= 8 && password === confirmPassword

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
        // Surface a friendlier hint for the most common case: the recovery
        // session has expired before the user finished resetting.
        error.message.toLowerCase().includes('session')
          ? 'Your reset link expired. Request a new one from the sign-in page.'
          : error.message
      )
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  return (
    <AuthShell backLabel="Back to sign in" backHref="/auth/signin">
      {!done ? (
        <>
          <p className="ec-label-tech mb-3">NEW PASSWORD</p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Set a <span className="ec-text-gradient">new password</span>
          </h1>
          <p className="mb-6 leading-relaxed text-slate-400">
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

          <p className="mt-6 text-center text-sm text-slate-400">
            Need a fresh link?{' '}
            <Link
              href="/auth/forgot-password"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Request another
            </Link>
          </p>
        </>
      ) : (
        <div className="space-y-3 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Password updated
          </h2>
          <p className="leading-relaxed text-slate-400">
            Taking you to your dashboard...
          </p>
        </div>
      )}
    </AuthShell>
  )
}
