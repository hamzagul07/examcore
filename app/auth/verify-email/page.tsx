'use client'

import { Suspense, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox, SubmitButton, SuccessBox } from '@/components/AuthFormBits'
import { sanitizeNextPath } from '@/lib/auth-redirect'

const CODE_LENGTH = 6

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailForm />
    </Suspense>
  )
}

function VerifyEmailSkeleton() {
  return (
    <AuthShell backLabel="Back to sign up" backHref="/auth/signup">
      <p className="ec-label-tech mb-3">VERIFY EMAIL</p>
      <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Check your <span className="ec-text-gradient">email</span>
      </h1>
      <p className="leading-relaxed text-slate-400">Loading...</p>
    </AuthShell>
  )
}

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const nextRaw = searchParams.get('next')

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')

  function focusIndex(index: number) {
    inputRefs.current[index]?.focus()
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setErrorMsg('')
    if (digit && index < CODE_LENGTH - 1) {
      focusIndex(index + 1)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusIndex(index - 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = Array(CODE_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)
    focusIndex(Math.min(pasted.length, CODE_LENGTH - 1))
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErrorMsg('Missing email address. Please sign up again.')
      return
    }
    if (code.length !== CODE_LENGTH) {
      setErrorMsg('Enter the full 6-digit code.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    })

    setLoading(false)
    if (error) {
      setErrorMsg('Invalid or expired code. Try again or request a new one.')
      return
    }

    const destination = sanitizeNextPath(nextRaw, '/dashboard')
    router.push(destination)
    router.refresh()
  }

  async function handleResend() {
    if (!email.includes('@')) {
      setErrorMsg('Missing email address. Please sign up again.')
      return
    }
    setResending(true)
    setErrorMsg('')
    setResent(false)

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    setResending(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setResent(true)
  }

  if (!email) {
    return (
      <AuthShell backLabel="Back to sign up" backHref="/auth/signup">
        <p className="ec-label-tech mb-3">VERIFY EMAIL</p>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-white">
          No email address found
        </h1>
        <p className="mb-6 leading-relaxed text-slate-400">
          Start from the sign-up page so we know where to send your code.
        </p>
        <Link href="/auth/signup" className="ec-btn-primary inline-flex w-full justify-center">
          Go to sign up
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell backLabel="Back to sign up" backHref="/auth/signup">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
          <Mail className="h-8 w-8 text-emerald-400" />
        </div>
        <p className="ec-label-tech mb-3">VERIFY EMAIL</p>
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Check your <span className="ec-text-gradient">email</span>
        </h1>
        <p className="leading-relaxed text-slate-400">
          We sent a 6-digit code to{' '}
          <strong className="text-white">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="label-overline mb-3 block text-center">
            Verification code
          </label>
          <div
            className="flex justify-center gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                className="h-12 w-10 rounded-xl border border-white/10 bg-dark-900/70 text-center text-lg font-semibold text-white outline-none transition-all focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(16,185,129,0.25)] sm:h-14 sm:w-12 sm:text-xl"
              />
            ))}
          </div>
        </div>

        {errorMsg && <ErrorBox message={errorMsg} />}
        {resent && (
          <SuccessBox message="A new code has been sent. Check your inbox." />
        )}

        <SubmitButton
          loading={loading}
          idleLabel="Verify"
          loadingLabel="Verifying..."
          disabled={code.length !== CODE_LENGTH}
        />
      </form>

      <div className="mt-6 space-y-3 text-center text-sm">
        <p className="text-slate-400">
          Didn&apos;t get the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend'}
          </button>
        </p>
        <p className="text-slate-500">
          Wrong email?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Sign up again
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
