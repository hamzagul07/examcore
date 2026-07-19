'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronRight, Info, Lock, Sparkles, Target } from 'lucide-react'
import { drillHref } from '@/lib/insights/drill-link'
import type { Recommendation } from '@/lib/insights/types'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { AskOmniAboutMark } from '@/components/omni-ai/AskOmniAboutMark'
import { SyllabusTopicBadge } from '@/components/SyllabusTopicBadge'
import { resolveMarkResultSubjectCode } from '@/lib/syllabi/attempts'
import type { SyllabusCode } from '@/lib/syllabus'
import type { LorBandResult, MarkingStyle, IbCriterionResult } from '@/lib/marking/types'
import { CONTACT_EMAIL } from '@/lib/site-config'
import {
  ERROR_LABELS,
  normalizeErrorClassification,
} from '@/lib/error-classifications'
import { getSubjectByCode } from '@/lib/profile-options'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { predictGradeFromPercentage, marksToNextGrade } from '@/lib/grade-boundaries'
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
    criteria_results?: IbCriterionResult[]
    marking_style?: MarkingStyle
    full_marks_rewrite?: {
      rewritten_answer: string
      annotations: Array<{ text: string; earns: string }>
    }
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
  isPaid,
}: {
  result: MarkingResultData
  attemptId?: string | null
  inkPages?: Array<{ photo_url: string; line_references: LineReference[] }>
  /**
   * Paid entitlement of the viewer. Only used to decide whether to show the
   * free upsell teaser for the full-marks rewrite. Pass `false` on the live mark
   * flow; omit elsewhere (e.g. historical attempt view) to suppress the teaser.
   */
  isPaid?: boolean
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

  // Board-aware labels: IB subjects must not be branded as Cambridge.
  const isIb = isIbSubjectCode(badgeSubjectCode ?? '')
  const boardLabel = isIb ? 'IB' : 'Cambridge'
  // Paradigm-aware: IB points subjects (e.g. Maths) mark against analytic mark
  // schemes (M/A marks), NOT markbands — so don't say "markbands" for them.
  const isIbPoints = isIb && result.ai_marking?.marking_style === 'point_based'

  const percentage =
    result.total_marks > 0
      ? Math.round((result.marks_earned / result.total_marks) * 100)
      : 0
  const grade = predictGradeFromPercentage(percentage)
  // A3: how many marks from the next grade band (Cambridge only — IB suppresses
  // the letter-grade estimate, same as the audit pill).
  const nextGradeStep = isIb
    ? null
    : marksToNextGrade(result.marks_earned, result.total_marks)
  // Free upsell teaser for the full-marks rewrite: only on the live mark flow
  // (isPaid === false), when marks were lost and the style is rewritable.
  const lostMarks =
    result.total_marks > 0 && result.marks_earned < result.total_marks
  const showRewriteTeaser =
    isPaid === false &&
    !result.ai_marking?.full_marks_rewrite &&
    lostMarks &&
    result.ai_marking?.marking_style !== 'mcq'
  const overline = buildOverline(result)
  const selectedMark = marks[selectedIndex] ?? marks[0]
  const hasStructuredResult = marks.length > 0
  // M2: criteria/markband results (IB essays, IA, TOK, EE) carry no per-mark
  // array — render them on criteria_results / band_result instead of gating on marks.
  const criteriaResults = result.ai_marking?.criteria_results
  const hasCriteria =
    (Array.isArray(criteriaResults) && criteriaResults.length > 0) ||
    !!result.ai_marking?.band_result
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
          {nextGradeStep && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--ec-brand)' }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              {nextGradeStep.marksNeeded} mark
              {nextGradeStep.marksNeeded === 1 ? '' : 's'}{' '}
              {['A', 'A*', 'E'].includes(nextGradeStep.nextGrade) ? 'from an' : 'from a'}{' '}
              {nextGradeStep.nextGrade}
            </p>
          )}
        </div>
      </div>

      <QuestionContextCard result={result} subjectCode={badgeSubjectCode} />

      {hasStructuredResult || hasCriteria ? (
        <div className="ms-result-grid">
          {hasStructuredResult && (
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
          )}

          <MarkAuditPanel
            marks={marks}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            marksEarned={result.marks_earned}
            totalMarks={result.total_marks}
            gradeLabel={isIb ? null : grade.grade}
            schemeLabel={schemeLabel(result)}
            bandResult={result.ai_marking.band_result}
            criteriaResults={result.ai_marking.criteria_results}
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
                Marked with the official {boardLabel} mark scheme
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
                We marked your answer using general {isIb ? 'IB' : 'A-Level'}{' '}
                criteria. Think we should add this paper? Email{' '}
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
                Marked with {boardLabel}{' '}
                {getSubjectByCode(badgeSubjectCode ?? '')?.label ??
                  (isIb ? 'Diploma' : 'A-Level')}{' '}
                {isIb ? (isIbPoints ? 'mark scheme conventions' : 'markbands') : 'conventions'}
              </p>
              <p className="ec-banner__meta">
                Your own question (not a past paper) — the same{' '}
                {isIbPoints
                  ? 'method (M) and accuracy (A) marks'
                  : isIb
                    ? 'criteria and markbands'
                    : 'mark types and bands'}{' '}
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
                Marked with general {isIb ? 'IB' : 'A-Level'} criteria
              </p>
              <p className="ec-banner__meta">
                This was not detected as {isIb ? 'an IB' : 'a Cambridge'} past
                paper question
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

        {result.ai_marking.full_marks_rewrite && (
          <FullMarksRewritePanel rewrite={result.ai_marking.full_marks_rewrite} />
        )}

        {showRewriteTeaser && <FullMarksRewriteTeaser />}

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

        {result.syllabus_tags &&
        result.syllabus_tags.length > 0 &&
        badgeSubjectCode &&
        result.total_marks > 0 &&
        result.marks_earned < result.total_marks ? (
          <StudyLessonsBlock
            subjectCode={badgeSubjectCode}
            codes={result.syllabus_tags}
          />
        ) : null}

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

        {isPaid && badgeSubjectCode && (
          <NextDrillCard subjectCode={badgeSubjectCode} />
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

/**
 * Premium: the student's own answer rewritten to full marks, with each addition
 * annotated with the mark it earns. Rendered only when the marking pipeline
 * attached `full_marks_rewrite` (paid users who lost marks).
 */
function FullMarksRewritePanel({
  rewrite,
}: {
  rewrite: {
    rewritten_answer: string
    annotations: Array<{ text: string; earns: string }>
  }
}) {
  return (
    <div className="ec-card border-[var(--ec-brand)]/30 p-5 sm:p-7">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" />
        <p className="ms-micro" style={{ margin: 0 }}>
          REWRITTEN TO FULL MARKS
        </p>
      </div>
      <h3 className="ms-h3">Your answer, taken to full marks</h3>
      <p className="mb-4 text-sm text-[var(--ec-text-faint)]">
        Your own answer, rewritten to show exactly what earns every mark.
      </p>
      <div className="rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 leading-relaxed text-[var(--ec-text-primary)]">
        <RichTextRenderer text={rewrite.rewritten_answer} />
      </div>

      {rewrite.annotations.length > 0 && (
        <div className="mt-5">
          <p className="ms-micro" style={{ marginBottom: 12 }}>
            WHAT EACH CHANGE EARNS
          </p>
          <ul className="space-y-2">
            {rewrite.annotations.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md border border-[var(--ec-brand)]/40 bg-[var(--ec-brand)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ec-brand)]">
                  {a.earns}
                </span>
                <span className="text-sm text-[var(--ec-text-secondary)]">
                  <RichTextRenderer text={a.text} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Free upsell teaser shown in place of the (paid-only) full-marks rewrite, when
 * the student lost marks. Never a takeaway — free users never had the rewrite —
 * it's a locked preview that converts on the exact moment they'd want it.
 */
function FullMarksRewriteTeaser() {
  return (
    <div className="ec-card relative overflow-hidden border-[var(--ec-brand)]/30 p-5 sm:p-7">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" />
        <p className="ms-micro" style={{ margin: 0 }}>
          PREMIUM
        </p>
      </div>
      <h3 className="ms-h3">See your answer rewritten to full marks</h3>
      <p className="mt-1 leading-relaxed text-[var(--ec-text-secondary)]">
        Premium rewrites <em>your</em> answer into a response that scores full
        marks — keeping what you got right and showing exactly what each missing
        mark needs, line by line.
      </p>
      <div
        aria-hidden
        className="mt-4 space-y-2 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 blur-[3px] select-none"
      >
        <div className="h-3 w-11/12 rounded bg-[var(--ec-border)]" />
        <div className="h-3 w-full rounded bg-[var(--ec-border)]" />
        <div className="h-3 w-4/5 rounded bg-[var(--ec-border)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--ec-border)]" />
      </div>
      <Link
        href="/pricing"
        className="ec-btn ec-btn-primary mt-5 inline-flex items-center gap-1.5"
      >
        <Sparkles className="h-4 w-4" />
        Unlock full-marks rewrites
      </Link>
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

/**
 * Premium coach: after a mark, surface the student's single weakest topic across
 * ALL their attempts in this subject and a one-tap drill for it. Data comes from
 * /api/insights/next-drill (same weakness engine as the progress dashboard).
 * Renders nothing when no drill resolves — free tier, no confirmed weakness, or a
 * subject with no stored questions (e.g. IB) — so it's never a dead card.
 */
function NextDrillCard({ subjectCode }: { subjectCode: string }) {
  const [drill, setDrill] = useState<Recommendation | null>(null)

  useEffect(() => {
    if (!subjectCode) return
    let active = true
    fetch(`/api/insights/next-drill?subject=${encodeURIComponent(subjectCode)}`)
      .then((r) => (r.ok ? r.json() : { drill: null }))
      .then((d) => {
        if (active) setDrill((d?.drill as Recommendation | null) ?? null)
      })
      .catch(() => {
        // Non-fatal — the rest of the result still renders.
      })
    return () => {
      active = false
    }
  }, [subjectCode])

  if (!drill) return null

  return (
    <div className="ec-card border-[var(--ec-brand)]/30 p-5 sm:p-7">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" />
        <p className="ms-micro" style={{ margin: 0 }}>
          YOUR WEAKEST SPOT
        </p>
      </div>
      <h3 className="ms-h3">Drill this next</h3>
      <div className="mt-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--ec-text-primary)]">
            {drill.targetLabel}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-[var(--ec-text-secondary)]">
            {drill.paperCode} · Q{drill.questionNumber} · {drill.totalMarks}m
          </span>
        </div>
        <p className="ec-break-anywhere mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {drill.reason}
        </p>
        <Link
          href={drillHref(drill)}
          className="ec-btn ec-btn-primary mt-3 inline-flex items-center gap-1.5 text-sm"
        >
          Drill this
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

type MarkBackLesson = { code: string; name: string; href: string }

/**
 * Mark-back — turns the marked weak areas (syllabus_tags) into links to the
 * exact course lessons that fix them. Resolution + existence check happen
 * server-side (/api/courses/lessons-for-topics), so links never 404.
 */
function StudyLessonsBlock({
  subjectCode,
  codes,
}: {
  subjectCode: string
  codes: SyllabusCode[]
}) {
  const key = useMemo(() => codes.join(','), [codes])
  const [lessons, setLessons] = useState<MarkBackLesson[]>([])

  useEffect(() => {
    if (!subjectCode || !key) return
    let active = true
    fetch(
      `/api/courses/lessons-for-topics?subject=${encodeURIComponent(
        subjectCode
      )}&codes=${encodeURIComponent(key)}`
    )
      .then((r) => (r.ok ? r.json() : { lessons: [] }))
      .then((d) => {
        if (active) setLessons(Array.isArray(d?.lessons) ? d.lessons : [])
      })
      .catch(() => {
        // Non-fatal — the rest of the result still renders.
      })
    return () => {
      active = false
    }
  }, [subjectCode, key])

  if (!lessons.length) return null

  return (
    <div className="ec-card border-[var(--ec-brand)]/25 p-6">
      <p className="ms-micro" style={{ marginBottom: 12 }}>
        STUDY THE LESSONS THAT FIX THIS
      </p>
      <div className="space-y-2">
        {lessons.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--ec-border)] px-4 py-3 transition-colors hover:border-[var(--ec-brand)]/50"
          >
            <span className="text-sm font-medium text-[var(--ec-text-primary)]">
              {l.name}{' '}
              <span className="text-[var(--ec-text-faint)]">· {l.code}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--ec-brand)]">
              Study
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
