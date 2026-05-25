'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
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

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            Examcore
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h1>
              <p className="text-slate-600 mb-6">
                Enter your email and we will send you a magic link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                    {errorMsg}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Sending...' : 'Send magic link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
              <p className="text-slate-600">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <p className="text-xs text-slate-500 pt-4">
                Did not get it? Check your spam folder, or{' '}
                <button
                  onClick={() => {
                    setSent(false)
                    setEmail('')
                  }}
                  className="underline hover:text-slate-700"
                >
                  try again
                </button>
                .
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}