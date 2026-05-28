'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function SignInPage() {
  const router = useRouter()
  const [method, setMethod] = useState<AuthMethod>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    // Middleware decides whether to send them to /onboarding or /dashboard.
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell>
      {!sent ? (
        <>
          <p className="ec-label-tech mb-3">WELCOME BACK</p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Sign in to <span className="ec-text-gradient">Examcore</span>
          </h1>
          <p className="mb-6 leading-relaxed text-slate-400">
            Pick how you&apos;d like to sign in.
          </p>

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
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
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

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Sign up
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
            We sent a magic link to{' '}
            <strong className="text-white">{email}</strong>. Click it to sign in.
          </p>
          <p className="pt-4 text-xs leading-relaxed text-slate-500">
            Did not get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
              className="font-medium text-emerald-400 underline transition-colors hover:text-emerald-300"
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
