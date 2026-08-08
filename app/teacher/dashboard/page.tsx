'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, Plus, Sparkles, TrendingUp } from 'lucide-react'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { useSetAIContext } from '@/lib/omni-ai/context'

interface Classroom {
  id: string
  name: string
  description?: string | null
  studentCount?: number
  /** Already returned by the API and previously discarded. */
  invite_code?: string | null
  subject?: string | null
  level?: string | null
}

export default function TeacherDashboard() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  useSetAIContext({ type: 'teacher_dashboard', data: {} }, [])

  useEffect(() => {
    fetch('/api/teacher/classrooms', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setClassrooms(d.classrooms || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function seedDemo() {
    setSeeding(true)
    const res = await fetch('/api/teacher/seed-demo', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    if (data.success) {
      window.location.href = `/teacher/classroom/${data.classroom_id}`
    }
  }

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <header className="mb-8 sm:mb-12">
        <p className="ec-eyebrow mb-4">Teacher dashboard</p>
        <h1 className="text-headline">Your classrooms</h1>
      </header>

      {classrooms.length === 0 && !loading && (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon">
            <Users className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="ms-teacher-empty__title">Make your first class</h2>
          <p className="ms-teacher-empty__body">
            You&apos;ll get a code to read out. Once a few students have marked
            something, this is where you&apos;ll see what the class as a whole keeps
            dropping marks on.
          </p>
          <div className="ms-teacher-dash-actions mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/teacher/classrooms/new" className="ec-btn-primary w-full justify-center sm:w-auto">
              <Plus className="mr-2 inline h-5 w-5" aria-hidden />
              Create a class
            </Link>
            {/* Secondary and plainly labelled: a real teacher should never be
                unsure whether the numbers in front of them are their students'. */}
            <button
              type="button"
              onClick={seedDemo}
              disabled={seeding}
              className="ec-btn-secondary w-full justify-center disabled:opacity-50 sm:w-auto"
            >
              <Sparkles className="mr-2 inline h-5 w-5" aria-hidden />
              {seeding ? 'Building example…' : 'Show me an example class'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
          <SkeletonBlock className="h-48 w-full" />
          <SkeletonBlock className="h-48 w-full" />
          <SkeletonBlock className="h-48 w-full" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/classroom/${c.id}`}
            className="ec-card ec-card-interactive min-h-[88px] p-5 sm:p-6"
          >
            <BookOpen className="mb-4 h-8 w-8 ec-text-brand" aria-hidden />
            <h3 className="mb-1 text-xl font-bold text-[var(--ec-text-primary)]">{c.name}</h3>
            <p className="mb-3 text-sm text-[var(--ec-text-secondary)]">
              {[c.subject, c.level].filter(Boolean).join(' · ') || 'Class'}
            </p>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              {c.studentCount === 1 ? '1 student' : `${c.studentCount || 0} students`}
              {c.invite_code ? (
                <>
                  {' · code '}
                  {/* The most-asked question in a classroom is "what's the code
                      again?" — answering it here saves opening the class. */}
                  <code className="font-mono tracking-wider text-[var(--ec-text-primary)]">
                    {formatInviteCode(c.invite_code)}
                  </code>
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2 text-sm ec-text-brand">
              <TrendingUp className="h-4 w-4" aria-hidden />
              <span>Open class →</span>
            </div>
          </Link>
        ))}
      </div>
    </TeacherPageContainer>
  )
}
