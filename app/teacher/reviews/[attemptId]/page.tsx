'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'
import { OverrideConsole } from '@/components/teacher/OverrideConsole'
import type { MarkAwarded } from '@/components/MarkingResultView'

interface AttemptData {
  id: string
  marks_earned: number
  total_marks: number
  question_text: string | null
  answer_photo_url: string | null
  line_references: LineReference[] | null
  marks_awarded: MarkAwarded[]
  user_profiles: { full_name: string | null } | null
}

export default function ReviewDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const router = useRouter()
  const [attempt, setAttempt] = useState<AttemptData | null>(null)

  useEffect(() => {
    fetch(`/api/teacher/attempt/${attemptId}/override`)
      .then((r) => r.json())
      .then((d) => {
        if (d.attempt) setAttempt(d.attempt)
      })
  }, [attemptId])

  if (!attempt) {
    return (
      <div className="p-12 text-slate-400">Loading submission...</div>
    )
  }

  const studentName =
    attempt.user_profiles?.full_name?.trim() || 'Student'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-6 py-8">
      <Link
        href="/teacher/reviews"
        className="mb-6 inline-block text-sm text-slate-400 hover:text-white"
      >
        ← Back to inbox
      </Link>

      <div className="mb-6">
        <div className="ec-label-tech mb-2">REVIEW</div>
        <h1 className="text-2xl font-bold text-white">{studentName}</h1>
        {attempt.question_text && (
          <p className="mt-2 text-sm text-slate-400">{attempt.question_text}</p>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="ec-card overflow-hidden p-4 lg:col-span-3">
          {attempt.answer_photo_url ? (
            <ExaminerInkOverlay
              imageUrl={attempt.answer_photo_url}
              lineReferences={attempt.line_references || []}
              animate={false}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-900/50 text-slate-500">
              No answer image for this demo submission. Mark overrides still
              work via the console →
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <OverrideConsole
            attempt={{
              id: attempt.id,
              marks_earned: attempt.marks_earned,
              total_marks: attempt.total_marks,
              marks_awarded: attempt.marks_awarded,
            }}
            onSubmit={() => router.push('/teacher/reviews')}
          />
        </div>
      </div>
    </div>
  )
}
