'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { BookOpen, Users, Check, AlertCircle } from 'lucide-react'
import { buildSignInHref, buildSignUpHref } from '@/lib/auth-redirect'

interface ClassroomPreview {
  name: string
  description?: string | null
  studentCount: number
}

export default function JoinClassroomPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [classroom, setClassroom] = useState<ClassroomPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    const normalizedCode = (typeof code === 'string' ? code : '').trim()
    if (!normalizedCode) return

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(
          `/api/classrooms/by-code/${encodeURIComponent(normalizedCode)}`
        )
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Something went wrong. Try again later.')
          return
        }

        if (!data.classroom) {
          setError('Invalid invite code. Check with your teacher.')
          return
        }

        setClassroom(data.classroom)

        const authRes = await fetch('/api/auth/check')
        const authData = await authRes.json()
        setNeedsAuth(!authData.user)
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : 'Something went wrong'
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [code])

  async function joinClassroom() {
    setJoining(true)
    setError('')

    const res = await fetch('/api/classrooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
    })
    const data = await res.json()

    if (data.success) {
      setJoined(true)
      setTimeout(() => router.push('/dashboard'), 1800)
    } else {
      setError(data.error || 'Failed to join')
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <p className="text-center text-[var(--ec-text-secondary)]">
        Loading invitation...
      </p>
    )
  }

  if (error && !classroom) {
    return (
      <div className="ec-card p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 ec-score-low" />
        <h2 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)]">
          Can&apos;t join
        </h2>
        <p className="text-[var(--ec-text-secondary)]">{error}</p>
        <Link
          href="/join"
          className="ec-btn-secondary mt-6 inline-flex min-h-[44px] items-center justify-center"
        >
          Try another code
        </Link>
      </div>
    )
  }

  if (joined && classroom) {
    return (
      <div className="ec-card p-8 text-center">
        <Check className="mx-auto mb-4 h-16 w-16 ec-score-high" />
        <h2 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)]">
          You&apos;re in!
        </h2>
        <p className="text-[var(--ec-text-secondary)]">
          Joined {classroom.name}. Redirecting to your dashboard...
        </p>
      </div>
    )
  }

  if (!classroom) {
    return null
  }

  const joinPath = `/join/${code}`
  const signUpHref = buildSignUpHref(joinPath)
  const signInHref = buildSignInHref(joinPath)

  return (
    <div className="ec-card p-8 text-center">
      <BookOpen className="mx-auto mb-4 h-16 w-16 ec-text-brand" />
      <div className="ec-label-tech mb-3">CLASSROOM INVITATION</div>
      <h1 className="mb-2 text-3xl font-bold text-[var(--ec-text-primary)]">
        {classroom.name}
      </h1>
      {classroom.description && (
        <p className="mb-4 text-[var(--ec-text-secondary)]">
          {classroom.description}
        </p>
      )}
      <div className="mb-8 flex items-center justify-center gap-2 text-sm text-[var(--ec-text-secondary)]">
        <Users className="h-4 w-4" />
        <span>{classroom.studentCount} students enrolled</span>
      </div>

      {error && (
        <div className="ec-tint-critical-chip mb-4 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {needsAuth ? (
        <div className="space-y-3">
          <a
            href={signUpHref}
            className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center gap-2"
          >
            Sign up to join
          </a>
          <a
            href={signInHref}
            className="ec-btn-secondary inline-flex w-full min-h-[48px] items-center justify-center"
          >
            Already have an account? Sign in
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={joinClassroom}
          disabled={joining}
          className="ec-btn-primary w-full min-h-[48px]"
        >
          {joining ? 'Joining...' : `Join ${classroom.name}`}
        </button>
      )}
    </div>
  )
}
