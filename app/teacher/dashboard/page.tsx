'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, Plus, Sparkles, TrendingUp } from 'lucide-react'
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
    <>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12">
          <div className="ec-label-tech mb-4">TEACHER DASHBOARD</div>
          <h1 className="text-huge gradient-text">Your classrooms</h1>
        </div>

        {classrooms.length === 0 && !loading && (
          <div className="ec-card p-12 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
            <h3 className="mb-2 text-2xl font-bold text-white">
              No classrooms yet
            </h3>
            <p className="mb-6 text-slate-400">
              Create one or seed a demo with simulated student data.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/teacher/classrooms/new" className="ec-btn-primary">
                <Plus className="mr-2 inline h-5 w-5" />
                Create classroom
              </Link>
              <button
                type="button"
                onClick={seedDemo}
                disabled={seeding}
                className="rounded-xl border border-white/10 px-6 py-3 text-white transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <Sparkles className="mr-2 inline h-5 w-5" />
                {seeding ? 'Seeding...' : 'Seed demo data'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-slate-400">Loading classrooms...</p>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/classroom/${c.id}`}
              className="ec-card ec-card-interactive p-6"
            >
              <BookOpen className="mb-4 h-8 w-8 text-emerald-400" />
              <h3 className="mb-2 text-xl font-bold text-white">{c.name}</h3>
              <p className="mb-4 text-sm text-slate-400">
                {c.studentCount || 0} students
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span>View analytics →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
