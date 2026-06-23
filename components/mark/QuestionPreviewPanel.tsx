'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'
import { SyllabusTopicBadge } from '@/components/SyllabusTopicBadge'
import type { MarkingStyle } from '@/lib/marking/types'
import type { SyllabusCode } from '@/lib/syllabus'
import type { MarkSchemeRubric } from '@/lib/marking/mark-scheme-display'

type QuestionDetail = {
  found: boolean
  paper_code?: string
  paper_session?: string
  question_number?: string
  question_text?: string
  total_marks?: number | null
  marking_type?: MarkingStyle | null
  syllabus_tags?: string[]
  rubric?: MarkSchemeRubric | null
  point_count?: number
}

const MARKING_TYPE_LABELS: Record<MarkingStyle, string> = {
  mcq: 'Multiple choice',
  point_based: 'Point-based marks',
  level_of_response: 'Level of response',
  mixed: 'Mixed marking',
}

type Props = {
  paperCode: string
  paperSession: string
  questionNumber: string
  subjectCode?: string
  className?: string
  onDetailLoaded?: (found: boolean) => void
}

export function QuestionPreviewPanel({
  paperCode,
  paperSession,
  questionNumber,
  subjectCode,
  className = '',
  onDetailLoaded,
}: Props) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!paperCode || !paperSession || !questionNumber.trim()) {
      setDetail(null)
      onDetailLoaded?.(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const q = encodeURIComponent(questionNumber.trim())
    fetch(
      `/api/mark/question-detail?paper_code=${encodeURIComponent(paperCode)}&paper_session=${encodeURIComponent(paperSession)}&question_number=${q}`
    )
      .then((r) => r.json())
      .then((data: QuestionDetail) => {
        if (!cancelled) {
          setDetail(data)
          onDetailLoaded?.(!!data.found)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
          onDetailLoaded?.(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [paperCode, paperSession, questionNumber])

  if (!paperCode || !paperSession || !questionNumber.trim()) return null

  return (
    <div className={`ms-question-preview ${className}`.trim()}>
      {loading ? (
        <div className="ms-question-preview-loading">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading question details…</span>
        </div>
      ) : detail?.found ? (
        <>
          <div className="ms-question-preview-meta">
            <span className="ms-question-preview-badge ms-question-preview-badge--ok">
              Official mark scheme in database
            </span>
            {detail.total_marks != null ? (
              <span className="ms-question-preview-stat">
                {detail.total_marks} mark{detail.total_marks === 1 ? '' : 's'}
              </span>
            ) : null}
            {detail.marking_type ? (
              <span className="ms-question-preview-stat">
                {MARKING_TYPE_LABELS[detail.marking_type]}
              </span>
            ) : null}
            {detail.point_count ? (
              <span className="ms-question-preview-stat">
                {detail.point_count} mark point{detail.point_count === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          {detail.question_text ? (
            <div className="ms-question-preview-text">
              <RichTextRenderer
                text={normalizeQuestionText(detail.question_text)}
                contentKind="question"
              />
            </div>
          ) : null}
          {detail.syllabus_tags && detail.syllabus_tags.length > 0 ? (
            <div className="ms-question-preview-tags">
              {detail.syllabus_tags.slice(0, 4).map((code) => (
                <SyllabusTopicBadge
                  key={code}
                  code={code as SyllabusCode}
                  subjectCode={subjectCode}
                  size="sm"
                />
              ))}
            </div>
          ) : null}
          {detail.rubric?.points.length ? (
            <div className="ms-question-preview-rubric">
              <p className="ms-micro" style={{ marginBottom: 8 }}>
                MARK SCHEME PREVIEW
              </p>
              <ol className="ms-scheme-rubric-points ms-scheme-rubric-points--preview">
                {detail.rubric.points.slice(0, 4).map((point) => (
                  <li key={`${point.type}-${point.id}`}>
                    <span className="ms-scheme-rubric-code">{point.type}</span>
                    <span className="ms-scheme-rubric-desc">
                      <RichTextRenderer text={point.description} contentKind="mark_scheme" />
                    </span>
                  </li>
                ))}
              </ol>
              {detail.rubric.points.length > 4 ? (
                <p className="ms-question-preview-more">
                  +{detail.rubric.points.length - 4} more mark points in the full scheme
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="ms-question-preview-missing">
          This question isn&apos;t in our database yet — we&apos;ll mark using general
          Cambridge criteria, or add a photo of the question below for better accuracy.
        </p>
      )}
    </div>
  )
}

export { MARKING_TYPE_LABELS }
