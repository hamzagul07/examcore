'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BookOpen, Users, Check, AlertCircle } from 'lucide-react'

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

        console.log('[join] Classroom lookup:', data)

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
      <div className="p-24 text-center text-slate-400">
        Loading invitation...
      </div>
    )
  }

  if (error && !classroom) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <div className="ec-card p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
          <h2 className="mb-2 text-2xl font-bold text-white">Can&apos;t join</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  if (joined && classroom) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <div className="ec-card p-8 text-center">
          <Check className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
          <h2 className="mb-2 text-2xl font-bold text-white">You&apos;re in!</h2>
          <p className="text-slate-400">
            Joined {classroom.name}. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (!classroom) {
    return null
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="ec-card p-8 text-center">
        <BookOpen className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
        <div className="ec-label-tech mb-3">CLASSROOM INVITATION</div>
        <h1 className="mb-2 text-3xl font-bold text-white">{classroom.name}</h1>
        {classroom.description && (
          <p className="mb-4 text-slate-400">{classroom.description}</p>
        )}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4" />
          <span>{classroom.studentCount} students enrolled</span>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-800/40 bg-red-950/50 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {needsAuth ? (
          <a
            href={`/auth/signup?redirect=${encodeURIComponent(`/join/${code}`)}`}
            className="ec-btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            Sign up to join
          </a>
        ) : (
          <button
            type="button"
            onClick={joinClassroom}
            disabled={joining}
            className="ec-btn-primary w-full"
          >
            {joining ? 'Joining...' : `Join ${classroom.name}`}
          </button>
        )}
      </div>
    </div>
  )
}
