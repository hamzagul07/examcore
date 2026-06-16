'use client'

import { Clock, FileText } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'
import { SyllabusTopicBadge } from '@/components/SyllabusTopicBadge'
import { formatPaperReference } from '@/lib/study-tips/display-context'
import { getSubjectByCode } from '@/lib/profile-options'
import { predictGradeFromPercentage } from '@/lib/grade-boundaries'
import type { MarkingResultData } from '@/components/MarkingResultView'
import { MARKING_TYPE_LABELS } from '@/components/mark/QuestionPreviewPanel'
import type { MarkingStyle } from '@/lib/marking/types'
import type { SyllabusCode } from '@/lib/syllabus'

export type MarkSchemeMeta = {
  total_marks?: number | null
  marking_type?: MarkingStyle | null
  syllabus_tags?: string[] | null
  question_number?: string | null
  paper_code?: string | null
  paper_session?: string | null
}

type Props = {
  result: MarkingResultData & {
    mark_scheme_meta?: MarkSchemeMeta | null
    time_spent_seconds?: number | null
  }
  subjectCode?: string
}

export function QuestionContextCard({ result, subjectCode }: Props) {
  const paperCode =
    result.detected_paper?.paper_code ?? result.mark_scheme_meta?.paper_code ?? null
  const paperSession =
    result.detected_paper?.paper_session ??
    result.mark_scheme_meta?.paper_session ??
    null
  const questionNumber =
    result.detected_paper?.question_number ??
    result.mark_scheme_meta?.question_number ??
    null

  const paperLine = formatPaperReference(paperCode, paperSession, questionNumber)
  const subjectLabel = subjectCode
    ? getSubjectByCode(subjectCode)?.label
    : paperCode?.split('/')[0]
      ? getSubjectByCode(paperCode.split('/')[0])?.label
      : null

  const markingType =
    result.mark_scheme_meta?.marking_type ??
    result.ai_marking?.marking_style ??
    null

  const schemeTotal =
    result.mark_scheme_meta?.total_marks ?? result.total_marks ?? null

  const percentage =
    result.total_marks > 0
      ? Math.round((result.marks_earned / result.total_marks) * 100)
      : 0
  const grade = predictGradeFromPercentage(percentage)

  const tags =
    result.syllabus_tags?.length
      ? result.syllabus_tags
      : result.mark_scheme_meta?.syllabus_tags ?? []

  const earnedCount =
    result.ai_marking?.marks_awarded?.filter((m) => m.earned).length ?? null
  const lostCount =
    result.ai_marking?.marks_awarded?.filter((m) => !m.earned).length ?? null

  return (
    <section className="ms-question-context ec-card-premium">
      <div className="ms-question-context-head">
        <div className="min-w-0 flex-1">
          {paperLine ? (
            <p className="ms-overline" style={{ marginBottom: 6 }}>
              {paperLine}
            </p>
          ) : subjectLabel ? (
            <p className="ms-overline" style={{ marginBottom: 6 }}>
              {subjectLabel}
            </p>
          ) : null}
          <h3 className="ms-h3" style={{ marginBottom: 0 }}>
            Question details
          </h3>
        </div>
        {result.time_spent_seconds ? (
          <span className="ms-question-context-time">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {result.time_spent_seconds}s to mark
          </span>
        ) : null}
      </div>

      <dl className="ms-question-context-stats">
        {schemeTotal != null ? (
          <div>
            <dt>Marks available</dt>
            <dd>{schemeTotal}</dd>
          </div>
        ) : null}
        <div>
          <dt>Your score</dt>
          <dd>
            {result.marks_earned} / {result.total_marks}
            {grade.grade ? ` · Grade ${grade.grade}` : ''}
          </dd>
        </div>
        {markingType ? (
          <div>
            <dt>Marking style</dt>
            <dd>{MARKING_TYPE_LABELS[markingType]}</dd>
          </div>
        ) : null}
        {earnedCount != null && lostCount != null ? (
          <div>
            <dt>Mark points</dt>
            <dd>
              {earnedCount} earned · {lostCount} missed
            </dd>
          </div>
        ) : null}
        {result.marking_mode === 'official_mark_scheme' ? (
          <div>
            <dt>Scheme</dt>
            <dd className="ms-question-context-scheme">Official Cambridge</dd>
          </div>
        ) : null}
      </dl>

      {result.question_text ? (
        <div className="ms-question-context-body">
          <p className="ms-micro" style={{ marginBottom: 10 }}>
            <FileText className="inline h-3.5 w-3.5 -translate-y-px" aria-hidden="true" />{' '}
            QUESTION
          </p>
          <div className="ec-question-text min-w-0 max-w-full overflow-x-auto break-words whitespace-pre-wrap text-base">
            <RichTextRenderer
              text={normalizeQuestionText(result.question_text)}
              contentKind="question"
            />
          </div>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="ms-question-context-tags">
          {tags.map((code) => (
            <SyllabusTopicBadge
              key={code}
              code={code as SyllabusCode}
              subjectCode={subjectCode}
              size="md"
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
