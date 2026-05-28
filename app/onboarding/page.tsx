'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox, SubmitButton } from '@/components/AuthFormBits'
import { ProfileFormFields } from '@/components/ProfileFormFields'
import {
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  DEFAULT_SUBJECTS,
} from '@/lib/profile-options'

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [board, setBoard] = useState(DEFAULT_BOARD)
  const [level, setLevel] = useState(DEFAULT_LEVEL)
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const canSubmit = subjects.length > 0 && !!board && !!level

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      setErrorMsg('Pick a level and at least one subject to continue.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'student',
        full_name: fullName.trim() || null,
        board,
        level,
        subjects,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not save your profile. Try again.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell showBetaBadge={false}>
      <div className="mb-7">
        <p className="ec-label-tech mb-3">GET STARTED</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Set up your profile
        </h1>
        <p className="mt-3 leading-relaxed text-slate-400">
          We&apos;ll use this to personalize your marking and find the right
          past papers for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfileFormFields
          fullName={fullName}
          setFullName={setFullName}
          board={board}
          setBoard={setBoard}
          level={level}
          setLevel={setLevel}
          subjects={subjects}
          setSubjects={setSubjects}
        />

        {errorMsg && <ErrorBox message={errorMsg} />}

        <SubmitButton
          loading={loading}
          idleLabel="Complete setup"
          loadingLabel="Saving..."
          disabled={!canSubmit}
        />
      </form>
    </AuthShell>
  )
}
