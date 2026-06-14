'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'
import { toAnswerPhotoStoragePath } from '@/lib/storage/answer-photo-paths'
import { OverrideConsole } from '@/components/teacher/OverrideConsole'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'
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
      <TeacherPageContainer className="ms-teacher-review-detail max-w-7xl">
        <p className="p-6 text-[var(--ec-text-secondary)] sm:p-0">Loading submission...</p>
      </TeacherPageContainer>
    )
  }

  const studentName =
    attempt.user_profiles?.full_name?.trim() || 'Student'

  return (
    <TeacherPageContainer className="ms-teacher-review-detail flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
      <TeacherBackLink href="/teacher/reviews">← Back to inbox</TeacherBackLink>

      <TeacherPageHeader
        label="REVIEW"
        title={studentName}
        lead={
          attempt.question_text ? (
            <RichTextRenderer
              text={normalizeQuestionText(attempt.question_text)}
              contentKind="question"
            />
          ) : undefined
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="ec-card overflow-hidden p-4 lg:col-span-3">
          {attempt.answer_photo_url ? (
            <ExaminerInkOverlay
              imageUrl={attempt.answer_photo_url}
              attemptId={attempt.id}
              photoRef={
                attempt.answer_photo_url
                  ? toAnswerPhotoStoragePath(attempt.answer_photo_url)
                  : undefined
              }
              lineReferences={attempt.line_references || []}
              animate={false}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)]">
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
    </TeacherPageContainer>
  )
}
