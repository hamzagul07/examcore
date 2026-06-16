'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { AskOmniAboutMark } from '@/components/omni-ai/AskOmniAboutMark'
import { SyllabusTopicBadge } from '@/components/SyllabusTopicBadge'
import { resolveMarkResultSubjectCode } from '@/lib/syllabi/attempts'
import type { SyllabusCode } from '@/lib/syllabus'
import type { LorBandResult, MarkingStyle } from '@/lib/marking/types'
import { CONTACT_EMAIL } from '@/lib/site-config'
import {
  ERROR_LABELS,
  normalizeErrorClassification,
} from '@/lib/error-classifications'
import { getSubjectByCode } from '@/lib/profile-options'
import { predictGradeFromPercentage } from '@/lib/grade-boundaries'
import { ExamSheet, ExamSheetLine } from '@/components/margin-notes/ExamSheet'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { MarkAuditPanel } from '@/components/mark/MarkAuditPanel'
import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { MarkSchemeRubricPanel } from '@/components/mark/MarkSchemeRubricPanel'
import { QuestionContextCard } from '@/components/mark/QuestionContextCard'
import type { MarkSchemeMeta } from '@/components/mark/QuestionContextCard'
import type { MarkSchemeRubric } from '@/lib/marking/mark-scheme-display'

export type MarkAwarded = {
  mark_id: number | string
  type: string
  earned: boolean
  reasoning: string
  error_classification?: string | null
  line_reference?: string | null
  margin_note?: string | null
}

export type MarkingResultData = {
  marks_earned: number
  total_marks: number
  ai_marking: {
    marks_awarded: MarkAwarded[]
    summary: string
    weak_topics: string[]
    what_to_study_next: string
    estimated_marks_explanation?: string
    band_result?: LorBandResult
    marking_style?: MarkingStyle
  }
  ocr_text?: string | null
  question_text?: string | null
  marking_mode:
    | 'official_mark_scheme'
    | 'general_criteria_paper_not_in_db'
    | 'general_criteria'
    | 'general_criteria_practice'
  detected_paper?: {
    paper_code: string
    paper_session: string
    question_number: string
  } | null
  syllabus_tags?: SyllabusCode[] | null
  subject_code?: string | null
  mark_scheme_meta?: MarkSchemeMeta | null
  mark_scheme_rubric?: MarkSchemeRubric | null
  time_spent_seconds?: number | null
}

function sheetWork(mark: MarkAwarded): string {
  const ref = mark.line_reference?.trim()
  if (ref) return ref
  const reasoning = mark.reasoning?.trim() ?? ''
  if (reasoning.length <= 100) return reasoning
  return `${reasoning.slice(0, 97)}…`
}

function resultSubheading(earned: number, total: number): string {
  if (total <= 0) return 'marked.'
  if (earned >= total) return 'full marks.'
  const pct = (earned / total) * 100
  if (pct >= 80) return 'strong work.'
  if (pct >= 50) return 'one mark got away.'
  return 'room to improve.'
}

function buildOverline(result: MarkingResultData): string | null {
  const parts: string[] = []
  if (result.detected_paper?.paper_code) {
    parts.push(result.detected_paper.paper_code.replace(/_/g, '/'))
  }
  if (result.detected_paper?.paper_session) {
    parts.push(result.detected_paper.paper_session)
  }
  if (result.detected_paper?.question_number) {
    parts.push(`Q${result.detected_paper.question_number}`)
  }
  return parts.length ? parts.join(' · ') : null
}

function schemeLabel(result: MarkingResultData): string | null {
  if (!result.detected_paper?.paper_code) return null
  return result.detected_paper.paper_code.replace(/_/g, '/')
}

export function MarkingResultView({
  result,
  attemptId,
  inkPages,
}: {
  result: MarkingResultData
  attemptId?: string | null
  inkPages?: Array<{ photo_url: string; line_references: LineReference[] }>
}) {
  const [showOCR, setShowOCR] = useState(false)
  const marksAwarded = result.ai_marking?.marks_awarded
  const marks = useMemo(() => marksAwarded ?? [], [marksAwarded])
  const defaultSelected = useMemo(() => {
    if (!marks.length) return 0
    const lost = marks.findIndex((m) => !m.earned)
    return lost >= 0 ? lost : 0
  }, [marks])
  const [selectedIndex, setSelectedIndex] = useState(defaultSelected)

  const badgeSubjectCode =
    resolveMarkResultSubjectCode({
      subject_code: result.subject_code,
      paper_code: result.detected_paper?.paper_code,
      syllabus_tags: result.syllabus_tags,
    }) ?? undefined

  const percentage =
    result.total_marks > 0
      ? Math.round((result.marks_earned / result.total_marks) * 100)
      : 0
  const grade = predictGradeFromPercentage(percentage)
  const overline = buildOverline(result)
  const selectedMark = marks[selectedIndex] ?? marks[0]
  const hasStructuredResult = marks.length > 0
  const activeMarkId = selectedMark?.type?.trim().toUpperCase() ?? null

  const handleInkMarkSelect = (markId: string) => {
    const idx = marks.findIndex(
      (m) => m.type.trim().toUpperCase() === markId.toUpperCase()
    )
    if (idx >= 0) setSelectedIndex(idx)
  }

  return (
    <div className="ms-marking-result min-w-0">
      <div className="ms-mark-result-head">
        <div>
          {overline ? (
            <p className="ms-overline" style={{ marginBottom: 8 }}>
              {overline}
            </p>
          ) : null}
          <h2 className="ms-h2" style={{ marginBottom: 0 }}>
            {result.marks_earned} / {result.total_marks} —{' '}
            <em>{resultSubheading(result.marks_earned, result.total_marks)}</em>
          </h2>
        </div>
      </div>

      <QuestionContextCard result={result} subjectCode={badgeSubjectCode} />

      {hasStructuredResult ? (
        <div className="ms-result-grid">
          <div>
            {inkPages && inkPages.length > 0 ? (
              <div className="ms-mark-ink-block">
                <ExaminerInkPerPage
                  pages={inkPages}
                  attemptId={attemptId ?? undefined}
                  animate
                  activeMarkId={activeMarkId}
                  onActiveMarkChange={handleInkMarkSelect}
                />
              </div>
            ) : null}

            <ExamSheet
              head="Your script, with Examiner's Ink"
              headRight="tap a line"
              tally={`${result.marks_earned} / ${result.total_marks}`}
              cite={
                selectedMark?.reasoning ? (
                  <RichTextRenderer text={selectedMark.reasoning} />
                ) : null
              }
            >
              {marks.map((mark, i) => (
                <ExamSheetLine
                  key={String(mark.mark_id)}
                  work={<MarkSnippet text={sheetWork(mark)} />}
                  mark={`${mark.type} ${mark.earned ? '✓' : '✗'}`}
                  ok={mark.earned}
                  note={
                    mark.margin_note ? (
                      <MarkSnippet text={mark.margin_note} className="ms-mark-snippet--inline" />
                    ) : undefined
                  }
                  noteOk={mark.earned}
                  active={selectedIndex === i}
                  onClick={() => setSelectedIndex(i)}
                />
              ))}
            </ExamSheet>
            <p className="ms-micro" style={{ marginTop: 14 }}>
              CLICK ANY LINE — THE AUDIT AND SCHEME CITATION FOLLOW IT
            </p>
          </div>

          <MarkAuditPanel
            marks={marks}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            marksEarned={result.marks_earned}
            totalMarks={result.total_marks}
            gradeLabel={grade.grade}
            schemeLabel={schemeLabel(result)}
            bandResult={result.ai_marking.band_result}
            rubric={result.mark_scheme_rubric}
          />
          {result.mark_scheme_rubric &&
          result.marking_mode === 'official_mark_scheme' ? (
            <MarkSchemeRubricPanel
              rubric={result.mark_scheme_rubric}
              activeMarkType={activeMarkId}
              compact
            />
          ) : null}
        </div>
      ) : null}

      <div className={hasStructuredResult ? 'ms-mark-secondary' : 'space-y-6'}>
        {result.marking_mode === 'official_mark_scheme' && result.detected_paper && (
          <div className="ec-banner ec-banner-success">
            <CheckCircle2 className="ec-banner__icon h-5 w-5 shrink-0" />
            <div>
              <p className="ec-banner__title">
                Marked with official Cambridge mark scheme
              </p>
              <p className="ec-banner__meta">
                {result.detected_paper.paper_code} •{' '}
                {result.detected_paper.paper_session} • Question{' '}
                {result.detected_paper.question_number}
              </p>
            </div>
          </div>
        )}

        {result.marking_mode === 'general_criteria_paper_not_in_db' && (
          <div className="ec-banner ec-banner-warning">
            <AlertCircle className="ec-banner__icon mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="ec-banner__title">
                This past paper is not in our database yet
              </p>
              <p className="ec-banner__meta leading-relaxed">
                {result.detected_paper && (
                  <>
                    We detected: {result.detected_paper.paper_code} •{' '}
                    {result.detected_paper.paper_session} • Question{' '}
                    {result.detected_paper.question_number}.{' '}
                  </>
                )}
                We marked your answer using general A-Level criteria. Think we
                should add this paper? Email{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {result.marking_mode === 'general_criteria_practice' && (
          <div className="ec-banner ec-banner-info">
            <Info className="ec-banner__icon h-5 w-5 shrink-0" />
            <div>
              <p className="ec-banner__title">
                Marked with Cambridge{' '}
                {getSubjectByCode(badgeSubjectCode ?? '')?.label ??
                  'A-Level'}{' '}
                conventions
              </p>
              <p className="ec-banner__meta">
                Your own question (not a past paper) — same mark types and bands
                examiners use, without an official mark scheme from our database.
              </p>
            </div>
          </div>
        )}

        {result.marking_mode === 'general_criteria' && (
          <div className="ec-banner ec-banner-info">
            <Info className="ec-banner__icon h-5 w-5 shrink-0" />
            <div>
              <p className="ec-banner__title">
                Marked with general A-Level criteria
              </p>
              <p className="ec-banner__meta">
                This was not detected as a Cambridge past paper question
              </p>
            </div>
          </div>
        )}

        {result.syllabus_tags && result.syllabus_tags.length > 0 && (
          <div>
            <p className="ms-micro" style={{ marginBottom: 12 }}>
              TOPICS COVERED
            </p>
            <div className="flex flex-wrap gap-2">
              {result.syllabus_tags.map((code) => (
                <SyllabusTopicBadge
                  key={code}
                  code={code}
                  subjectCode={badgeSubjectCode}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="ms-micro" style={{ marginBottom: 12 }}>
            SUMMARY
          </p>
          <h3 className="ms-h3">What the examiner saw</h3>
          <div className="leading-relaxed text-[var(--ec-text-secondary)]">
            <RichTextRenderer text={result.ai_marking?.summary ?? ''} />
          </div>
        </div>

        {result.ai_marking.estimated_marks_explanation && (
          <div className="ec-banner ec-banner-warning">
            <p className="ec-banner__meta leading-relaxed">
              <strong className="ec-banner__title">Marking note:</strong>{' '}
              <RichTextRenderer text={result.ai_marking.estimated_marks_explanation} />
            </p>
          </div>
        )}

        {result.ai_marking.band_result &&
          result.ai_marking.band_result.strengths &&
          result.ai_marking.band_result.strengths.length > 0 && (
            <div className="ec-card p-5 sm:p-7">
              <p className="ms-micro" style={{ marginBottom: 12 }}>
                STRENGTHS
              </p>
              <ul className="list-inside list-disc space-y-1 text-[var(--ec-text-secondary)]">
                {result.ai_marking.band_result.strengths.map((s, i) => (
                  <li key={i}>
                    <RichTextRenderer text={s} />
                  </li>
                ))}
              </ul>
            </div>
          )}

        {result.ai_marking.weak_topics &&
          result.ai_marking.weak_topics.length > 0 && (
            <div>
              <p className="ms-micro" style={{ marginBottom: 12 }}>
                TOPICS TO WORK ON
              </p>
              <h3 className="ms-h3">Where you lost marks</h3>
              <ul className="space-y-2">
                {result.ai_marking.weak_topics.map((topic, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[var(--ec-text-secondary)]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ec-chip-warning-text)]" />
                    <span>
                      <RichTextRenderer text={topic} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {result.ai_marking.what_to_study_next && (
          <div className="ec-card p-6">
            <p className="ms-micro" style={{ marginBottom: 12 }}>
              WHAT TO STUDY NEXT
            </p>
            <div className="leading-relaxed text-[var(--ec-text-secondary)]">
              <RichTextRenderer text={result.ai_marking.what_to_study_next} />
            </div>
          </div>
        )}

        {attemptId && (
          <div className="flex justify-center pt-2">
            <AskOmniAboutMark attemptId={attemptId} />
          </div>
        )}

        {result.ocr_text && (
          <div>
            <button
              type="button"
              onClick={() => setShowOCR(!showOCR)}
              className="font-mono text-xs font-medium text-[var(--ec-text-secondary)] underline ec-link-muted"
            >
              {showOCR ? 'HIDE' : 'SHOW'} WHAT THE AI READ FROM YOUR HANDWRITING
            </button>
            {showOCR && (
              <pre className="mt-2 max-w-full overflow-x-auto break-words whitespace-pre-wrap rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 font-mono text-xs text-[var(--ec-text-secondary)]">
                {result.ocr_text}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorClassificationPill({
  earned,
  classification,
}: {
  earned: boolean
  classification?: string | null
}) {
  if (earned) return null
  const code = normalizeErrorClassification(classification)
  if (code === 'no_error') return null
  const label = ERROR_LABELS[code]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        color: label.color,
        borderColor: `${label.color}55`,
        background: `${label.color}15`,
      }}
    >
      <span aria-hidden="true">{label.icon}</span>
      {label.label}
    </span>
  )
}

export { ErrorClassificationPill }
