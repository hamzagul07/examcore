'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { buildSignInHref, buildSignUpHref } from '@/lib/auth-redirect'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

interface ClassroomPreview {
  name: string
  description?: string | null
  studentCount: number
}

/** Shown while the invite loads, and as the Suspense fallback below. */
function JoinSkeleton() {
  return (
    <div
      className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8"
      aria-busy
      aria-label="Loading invitation"
    >
      <SkeletonBlock className="mx-auto mb-4 h-16 w-16 rounded" />
      <SkeletonBlock className="mx-auto mb-3 h-8 w-56 max-w-full" />
      <SkeletonLine className="mx-auto mb-6 h-4 w-72 max-w-full" />
      <SkeletonBlock className="mx-auto h-12 w-full max-w-xs" />
    </div>
  )
}

/**
 * `useSearchParams` client-side renders everything up to the nearest Suspense
 * boundary, so the boundary is declared here rather than left to the framework.
 */
export default function JoinClassroomPage() {
  return (
    <Suspense fallback={<JoinSkeleton />}>
      <JoinClassroom />
    </Suspense>
  )
}

function JoinClassroom() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Set on the post-auth return leg only (see joinPath below). A student who
  // signed up *in order to* join should not have to find and press the button a
  // second time — that round trip is where an invited student silently fails to
  // end up on the roster.
  const autoJoin = searchParams.get('auto') === '1'
  const [classroom, setClassroom] = useState<ClassroomPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const autoJoinedRef = useRef(false)

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

  const joinClassroom = useCallback(async () => {
    setJoining(true)
    setError('')

    try {
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
    } catch {
      // A dropped request must leave the button usable rather than stuck on
      // "Joining…" — a student in a lesson gets one attempt at this.
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setJoining(false)
    }
  }, [code, router])

  // Complete the join automatically once the student is back from signing up.
  useEffect(() => {
    if (!autoJoin || autoJoinedRef.current) return
    if (loading || needsAuth || joined || !classroom) return
    autoJoinedRef.current = true
    void joinClassroom()
  }, [autoJoin, loading, needsAuth, joined, classroom, joinClassroom])

  if (loading) return <JoinSkeleton />

  // The auto-join leg should read as one continuous step, not as a form that
  // reappears and submits itself.
  if (autoJoin && joining && !joined) {
    return (
      <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8" aria-busy>
        <span
          className="mx-auto mb-4 inline-grid h-16 min-w-16 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 font-mono text-xl font-bold tracking-wide ec-text-brand"
          aria-hidden
        >
          CL
        </span>
        <h2 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Adding you to {classroom?.name ?? 'the class'}…
        </h2>
      </div>
    )
  }

  if (error && !classroom) {
    return (
      <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8">
        <span
          className="mx-auto mb-4 inline-grid h-16 min-w-16 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 font-mono text-xl font-bold tracking-wide ec-score-low"
          aria-hidden
        >
          !
        </span>
        <h2 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
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
      <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8">
        <span
          className="mx-auto mb-4 inline-grid h-16 min-w-16 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 font-mono text-xl font-bold tracking-wide ec-score-high"
          aria-hidden
        >
          ✓
        </span>
        <h2 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
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

  // `auto=1` so the join completes on arrival back here, rather than asking a
  // student who has just signed up to press Join a second time.
  const joinPath = `/join/${code}?auto=1`
  const signUpHref = buildSignUpHref(joinPath)
  const signInHref = buildSignInHref(joinPath)

  return (
    <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8">
      <span
          className="mx-auto mb-4 inline-grid h-16 min-w-16 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 font-mono text-xl font-bold tracking-wide ec-text-brand"
          aria-hidden
        >
          CL
        </span>
      <div className="ec-label-tech mb-3">CLASSROOM INVITATION</div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
        {classroom.name}
      </h1>
      {classroom.description && (
        <p className="mb-4 text-[var(--ec-text-secondary)]">
          {classroom.description}
        </p>
      )}
      <div className="mb-8 flex items-center justify-center gap-2 text-sm text-[var(--ec-text-secondary)]">
        <span className="font-mono text-[10px] font-bold tracking-wide" aria-hidden>
          N
        </span>
        <span>{classroom.studentCount} students enrolled</span>
      </div>

      {error && (
        <div className="ec-card ec-card--paper ec-tint-critical-chip mb-4 p-3 text-sm">
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
