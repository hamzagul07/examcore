'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import { toAnswerPhotoStoragePath } from '@/lib/storage/answer-photo-paths'
import { OverrideConsole } from '@/components/teacher/OverrideConsole'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import type { MarkAwarded } from '@/components/MarkingResultView'

interface AttemptData {
  id: string
  marks_earned: number
  total_marks: number
  question_text: string | null
  answer_photo_url: string | null
  line_references: LineReference[] | null
  ink_pages: Array<{ photo_url: string; line_references: LineReference[] }> | null
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
        <div aria-busy aria-label="Loading submission">
          {/* Back link (44px row), eyebrow, name, one-line question lead, then the
              3/2 split the real page uses: script on the left, console on the right. */}
          <SkeletonLine className="mb-6 h-4 w-28" />
          <SkeletonLine className="mb-3 h-3 w-16" />
          <SkeletonBlock className="h-10 w-72 max-w-full sm:h-11" />
          <SkeletonLine className="mb-8 mt-3 h-4 w-96 max-w-full sm:mb-10" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SkeletonBlock className="aspect-[4/3] w-full lg:col-span-3" />
            <SkeletonBlock className="h-96 w-full lg:col-span-2" />
          </div>
        </div>
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
              text={attempt.question_text}
              contentKind="question"
            />
          ) : undefined
        }
      />

      <div className="ec-land grid flex-1 grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="ec-card ec-card--paper overflow-hidden p-4 lg:col-span-3">
          {attempt.ink_pages && attempt.ink_pages.length > 0 ? (
            <ExaminerInkPerPage
              pages={attempt.ink_pages}
              attemptId={attempt.id}
              animate={false}
            />
          ) : attempt.answer_photo_url ? (
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
            <div className="ec-card ec-card--paper flex aspect-[4/3] flex-col items-center justify-center gap-4 bg-[var(--ec-surface-raised)] p-6 text-center">
              <span className="ec-ink-stamp ec-ink-stamp--hero" aria-hidden>
                —
              </span>
              <p className="text-body mx-auto max-w-sm text-[var(--ec-text-secondary)]">
                No answer image for this demo submission. Mark overrides still
                work via the console →
              </p>
            </div>
          )}
        </div>

        <div className="ec-land ec-land--1 lg:col-span-2">
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
