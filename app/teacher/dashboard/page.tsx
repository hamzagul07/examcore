'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, Plus, Sparkles, TrendingUp } from 'lucide-react'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import { useSetAIContext } from '@/lib/omni-ai/context'

interface Classroom {
  id: string
  name: string
  description?: string | null
  studentCount?: number
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
        <div className="ec-card p-6 text-center sm:p-12">
          <Users className="mx-auto mb-4 h-16 w-16 ec-text-brand" />
          <h3 className="mb-2 text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">
            No classrooms yet
          </h3>
          <p className="mb-6 text-[var(--ec-text-secondary)]">
            Create one or seed a demo with simulated student data.
          </p>
          <div className="ms-teacher-dash-actions flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/teacher/classrooms/new" className="ec-btn-primary w-full justify-center sm:w-auto">
              <Plus className="mr-2 inline h-5 w-5" />
              Create classroom
            </Link>
            <button
              type="button"
              onClick={seedDemo}
              disabled={seeding}
              className="ec-btn-secondary w-full justify-center disabled:opacity-50 sm:w-auto"
            >
              <Sparkles className="mr-2 inline h-5 w-5" />
              {seeding ? 'Seeding...' : 'Seed demo data'}
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
            <BookOpen className="mb-4 h-8 w-8 ec-text-brand" />
            <h3 className="mb-2 text-xl font-bold text-[var(--ec-text-primary)]">{c.name}</h3>
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
              {c.studentCount || 0} students
            </p>
            <div className="flex items-center gap-2 text-sm ec-text-brand">
              <TrendingUp className="h-4 w-4" />
              <span>View analytics →</span>
            </div>
          </Link>
        ))}
      </div>
    </TeacherPageContainer>
  )
}
