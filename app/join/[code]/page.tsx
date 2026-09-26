'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { buildSignInHref, buildSignUpHref } from '@/lib/auth-redirect'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { JoinConsentNote } from '@/components/join/JoinConsentNote'
import {
  joinDestination,
  joinFailureMessage,
  joinViewFor,
  recordJoinConsent,
  takeJoinConsent,
  type InvitePreview,
  type JoinView,
} from '@/lib/student/join'
import { isValidInviteCode, normalizeInviteCode } from '@/lib/teacher/invite-code'

/** Shown while the invite loads, and as the Suspense fallback below. */
function JoinSkeleton() {
  return (
    <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading invitation
      </span>
      <SkeletonBlock className="mx-auto mb-4 h-16 w-16 rounded" />
      <SkeletonBlock className="mx-auto mb-3 h-8 w-56 max-w-full" />
      <SkeletonLine className="mx-auto mb-6 h-4 w-72 max-w-full" />
      <SkeletonBlock className="mx-auto mb-6 h-28 w-full" />
      <SkeletonBlock className="mx-auto h-12 w-full max-w-xs" />
    </div>
  )
}

/** The square ink stamp at the top of every join card. */
function Stamp({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'high' | 'low' }) {
  const toneClass = tone === 'high' ? 'ec-score-high' : tone === 'low' ? 'ec-score-low' : 'ec-text-brand'
  return (
    <span
      className={`mx-auto mb-4 inline-grid h-16 min-w-16 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 font-mono text-xl font-bold tracking-wide ${toneClass}`}
      aria-hidden
    >
      {children}
    </span>
  )
}

function Card({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className="ms-join-card ec-card ec-card--paper p-6 text-center sm:p-8" aria-busy={busy || undefined}>
      {children}
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

type Loaded =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; classroom: InvitePreview; view: JoinView; next: string }

/**
 * Join a class from an invite link (docs/TEACHER_SYSTEM_SPEC.md §4).
 *
 * The student always sees what joining shares before they are enrolled
 * (JoinConsentNote) — on the signed-out card, and again on the preview with
 * the class, subject and teacher filled in. The post-sign-up leg (`?auto=1`)
 * joins without a second click only when this browser recorded that the
 * student chose "Sign up to join" on the signed-out card (lib/student/join.ts);
 * a bare `?auto=1` link just shows the preview and its Join button.
 */
function JoinClassroom() {
  const { code: rawCode } = useParams<{ code: string }>()
  const code = normalizeInviteCode(typeof rawCode === 'string' ? rawCode : '')
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoJoin = searchParams.get('auto') === '1'

  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' })
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState<{ name: string; next: string } | null>(null)
  const [joinError, setJoinError] = useState('')
  const autoJoinedRef = useRef(false)

  useEffect(() => {
    // A code outside the charset cannot be real; do not spend a lookup on it.
    if (!isValidInviteCode(code)) {
      setLoaded({ kind: 'error', message: 'Invalid invite code. Check with your teacher.' })
      return
    }
    let cancelled = false
    async function load() {
      setLoaded({ kind: 'loading' })
      try {
        const res = await fetch(`/api/classrooms/by-code/${encodeURIComponent(code)}`, { cache: 'no-store' })
        const data = (await res.json().catch(() => ({}))) as {
          classroom?: InvitePreview | null
          next?: string
          error?: string
        }
        if (cancelled) return
        // The preview needs a session (it was an anonymous classroom-name
        // oracle — code review §2). A signed-out student holding a real link
        // must not hit a dead end: they get the statement and sign-up.
        if (res.status === 401) {
          setLoaded({ kind: 'signed_out' })
          return
        }
        if (!res.ok || !data.classroom) {
          setLoaded({ kind: 'error', message: data.error || joinFailureMessage(res.status, data) })
          return
        }
        let storage: Storage | null = null
        try {
          storage = window.localStorage
        } catch {
          storage = null
        }
        const view = joinViewFor(data.classroom, {
          autoJoin,
          consentRecorded: takeJoinConsent(storage, code),
        })
        setLoaded({
          kind: 'preview',
          classroom: data.classroom,
          view,
          next: joinDestination(data.next),
        })
      } catch {
        if (!cancelled) {
          setLoaded({ kind: 'error', message: 'Could not reach the server. Check your connection and try again.' })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [code, autoJoin])

  const joinClassroom = useCallback(async () => {
    if (loaded.kind !== 'preview') return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; next?: string; error?: string }
      if (res.ok && data.success) {
        const next = data.next === undefined ? loaded.next : joinDestination(data.next)
        setJoined({ name: loaded.classroom.name, next })
        window.setTimeout(() => router.push(next), 1200)
        return
      }
      setJoinError(joinFailureMessage(res.status, data))
    } catch {
      // A dropped request must leave the button usable rather than stuck on
      // "Joining…" — a student in a lesson gets one attempt at this.
      setJoinError('Could not reach the server. Check your connection and try again.')
    } finally {
      setJoining(false)
    }
  }, [code, loaded, router])

  // The post-sign-up leg, with consent recorded before they left to sign up.
  useEffect(() => {
    if (loaded.kind !== 'preview' || loaded.view !== 'auto_join' || autoJoinedRef.current) return
    autoJoinedRef.current = true
    void joinClassroom()
  }, [loaded, joinClassroom])

  if (loaded.kind === 'loading') return <JoinSkeleton />

  if (joined) {
    return (
      <Card>
        <Stamp tone="high">✓</Stamp>
        <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">You&apos;re in!</h1>
        <p className="text-[var(--ec-text-secondary)]" role="status" aria-live="polite">
          Joined {joined.name}. Taking you to your sets…
        </p>
        <Link
          href={joined.next}
          className="ec-btn-secondary mt-6 inline-flex min-h-[44px] items-center justify-center"
        >
          Go now
        </Link>
      </Card>
    )
  }

  if (loaded.kind === 'error') {
    return (
      <Card>
        <Stamp tone="low">!</Stamp>
        <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">Can&apos;t join</h1>
        <p className="text-[var(--ec-text-secondary)]" role="alert">
          {loaded.message}
        </p>
        <Link href="/join" className="ec-btn-secondary mt-6 inline-flex min-h-[44px] items-center justify-center">
          Try another code
        </Link>
      </Card>
    )
  }

  // `auto=1` so the join completes on arrival back here — but only because
  // the click below records that the statement was shown first.
  const joinPath = `/join/${encodeURIComponent(code)}?auto=1`
  const rememberConsent = () => {
    try {
      recordJoinConsent(window.localStorage, code)
    } catch {
      // Storage blocked: they will press Join on the preview instead.
    }
  }

  if (loaded.kind === 'signed_out') {
    return (
      <Card>
        <Stamp>CL</Stamp>
        <div className="ec-label-tech mb-3">CLASSROOM INVITATION</div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Sign in to see this invitation
        </h1>
        <p className="mb-6 text-[var(--ec-text-secondary)]">
          Your teacher has invited you to a class. Sign in, or create a free account, and you will join it
          straight away.
        </p>
        <JoinConsentNote className="mb-6" />
        <div className="space-y-3">
          <a
            href={buildSignUpHref(joinPath)}
            onClick={rememberConsent}
            className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center gap-2"
          >
            Sign up to join
          </a>
          <a
            href={buildSignInHref(joinPath)}
            onClick={rememberConsent}
            className="ec-btn-secondary inline-flex w-full min-h-[48px] items-center justify-center"
          >
            Already have an account? Sign in
          </a>
        </div>
      </Card>
    )
  }

  const { classroom, view, next } = loaded

  if (view === 'auto_join' && !joinError) {
    // One continuous step, not a form that reappears and submits itself.
    return (
      <Card busy>
        <Stamp>CL</Stamp>
        <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl" role="status" aria-live="polite">
          Adding you to {classroom.name}…
        </h1>
      </Card>
    )
  }

  const heading = (
    <>
      <Stamp>CL</Stamp>
      <div className="ec-label-tech mb-3">CLASSROOM INVITATION</div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--ec-text-primary)] [overflow-wrap:anywhere] sm:text-3xl">
        {classroom.name}
      </h1>
      <p className="mb-1 text-sm text-[var(--ec-text-secondary)]">
        {[classroom.subject_label, classroom.level].filter(Boolean).join(' · ') || 'Class'} · with{' '}
        {classroom.teacher_display_name}
      </p>
      {classroom.description ? (
        <p className="mb-2 whitespace-pre-line text-[var(--ec-text-secondary)] [overflow-wrap:anywhere]">
          {classroom.description}
        </p>
      ) : null}
      <p className="mb-6 font-mono text-xs text-[var(--ec-text-faint)]">
        {classroom.student_count} {classroom.student_count === 1 ? 'student' : 'students'} in the class
      </p>
    </>
  )

  if (view === 'member') {
    return (
      <Card>
        {heading}
        <p className="mb-6 text-[var(--ec-text-secondary)]">You&apos;re already in this class.</p>
        <Link href={next} className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center">
          See your sets
        </Link>
      </Card>
    )
  }

  if (view === 'removed') {
    return (
      <Card>
        {heading}
        <p className="text-[var(--ec-text-secondary)]" role="alert">
          Your teacher removed you from this class, so this code cannot add you back. Speak to your teacher if you
          think that was a mistake.
        </p>
      </Card>
    )
  }

  if (view === 'own_class') {
    return (
      <Card>
        {heading}
        <p className="mb-6 text-[var(--ec-text-secondary)]">
          This is your own class — share the code with your students.
        </p>
        <Link
          href="/teacher/dashboard"
          className="ec-btn-secondary inline-flex w-full min-h-[48px] items-center justify-center"
        >
          Back to your desk
        </Link>
      </Card>
    )
  }

  return (
    <Card>
      {heading}
      <JoinConsentNote
        className="mb-6"
        teacherName={classroom.teacher_display_name}
        subjectLabel={classroom.subject_label}
        rejoining={classroom.membership === 'left'}
      />
      {joinError ? <FormErrorAlert message={joinError} className="mb-4 text-left" /> : null}
      <button
        type="button"
        onClick={() => void joinClassroom()}
        disabled={joining}
        aria-busy={joining || undefined}
        className="ec-btn-primary inline-flex w-full min-h-[48px] items-center justify-center disabled:opacity-70"
      >
        {joining ? 'Joining…' : classroom.membership === 'left' ? `Rejoin ${classroom.name}` : `Join ${classroom.name}`}
      </button>
      <p className="mt-3 text-xs text-[var(--ec-text-faint)]">By joining you agree to share your work as described above.</p>
    </Card>
  )
}
