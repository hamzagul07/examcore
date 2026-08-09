'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { WeakSpotDrillCard } from '@/components/insights/WeakSpotDrillCard'
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
import { markingBoardLabel } from '@/lib/marking/exam-board'
import { predictGradeFromPercentage, marksToNextGrade } from '@/lib/grade-boundaries'
import { ExamSheet, ExamSheetLine } from '@/components/margin-notes/ExamSheet'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { MarkAuditPanel } from '@/components/mark/MarkAuditPanel'
import { MarkGapPanel } from '@/components/examiner-ink/MarkGapPanel'
import { MarkBandLadder } from '@/components/examiner-ink/MarkBandLadder'
import { buildMarkGap, buildBandGap, inlineGhostFixes } from '@/lib/marking/mark-gap'
import {
  buildPostMarkDiagnosis,
  type PostMarkDiagnosis,
} from '@/lib/marking/post-mark-ask'
import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { MarkSchemeRubricPanel } from '@/components/mark/MarkSchemeRubricPanel'
import { QuestionContextCard } from '@/components/mark/QuestionContextCard'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { Disclosure } from '@/components/ui/Disclosure'
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
  primaryAction,
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
  /**
   * MK-05 — “what should I do next?” sits after the mark gap / band ladder,
   * before mark-by-mark evidence, so the action isn’t buried under audit chrome.
   */
  primaryAction?: ReactNode
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

  // Board-aware labels: never brand Edexcel/OxfordAQA/etc. as Cambridge.
  const isIb = isIbSubjectCode(badgeSubjectCode ?? '')
  const boardFull = markingBoardLabel(badgeSubjectCode)
  const boardLabel = boardFull === 'IB Diploma' ? 'IB' : boardFull
  const boardArticle = /^(IB|AP|[AEIOU])/i.test(boardLabel)
    ? `an ${boardLabel}`
    : `a ${boardLabel}`
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
  // Computed only for the teaser's audience — the diagnosis is a read over
  // marks_awarded, so it costs nothing, but it should never render for someone
  // who already has the rewrite in front of them.
  const postMarkDiagnosis = useMemo(
    () =>
      showRewriteTeaser
        ? buildPostMarkDiagnosis({
            marksAwarded: result.ai_marking?.marks_awarded ?? [],
            marksEarned: result.marks_earned,
            totalMarks: result.total_marks,
          })
        : null,
    [showRewriteTeaser, result.ai_marking, result.marks_earned, result.total_marks]
  )
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

  // The ink overlay identifies a mark by its unique ref_id (its index in this
  // same marks array), so two marks sharing a code select independently. Legacy
  // attempts persisted before ref_id existed fall back to code matching — detect
  // that and feed the overlay the code instead, preserving old behaviour.
  const inkHasRefIds =
    inkPages?.some((p) => p.line_references.some((r) => r.ref_id != null)) ?? false
  const activeInkKey = inkHasRefIds ? String(selectedIndex) : activeMarkId
  const handleInkRefSelect = (refKey: string) => {
    if (!inkHasRefIds) {
      handleInkMarkSelect(refKey) // legacy: refKey is a stamp code
      return
    }
    const idx = Number(refKey)
    if (Number.isInteger(idx) && idx >= 0 && idx < marks.length) {
      setSelectedIndex(idx)
    }
  }

  // The Mark Gap: the marks that were available but not awarded, each paired
  // with the rewrite's fix when present. Drives the ghost insertions on the
  // script and the gap panel beneath it.
  const markGap = useMemo(
    () => buildMarkGap(result.ai_marking, result.marks_earned, result.total_marks),
    [result.ai_marking, result.marks_earned, result.total_marks]
  )
  const ghostFixes = useMemo(() => inlineGhostFixes(markGap), [markGap])

  // Level-of-response marking has no per-mark ticks — the gap is the band above
  // the one achieved. Built from the rubric's bands, degrading to a two-rung
  // here/next view when the attempt carries no rubric.
  const bandGap = useMemo(
    () =>
      result.ai_marking.band_result
        ? buildBandGap(
            result.ai_marking.band_result,
            result.mark_scheme_rubric?.bands ?? null,
            result.ai_marking.full_marks_rewrite ?? null
          )
        : null,
    [
      result.ai_marking.band_result,
      result.mark_scheme_rubric,
      result.ai_marking.full_marks_rewrite,
    ]
  )
  // When the band ladder owns the band story, drop the duplicates: the near-
  // empty audit card (no per-mark rows to show) and the rubric's band list.
  const bandLadderShown = !!bandGap && !hasStructuredResult
  const showAudit =
    hasStructuredResult || (result.ai_marking.criteria_results?.length ?? 0) > 0

  const handleInkMarkSelect = (markId: string) => {
    const idx = marks.findIndex(
      (m) => m.type.trim().toUpperCase() === markId.toUpperCase()
    )
    if (idx >= 0) setSelectedIndex(idx)
  }

  // Which scheme the work was marked against — rendered once, near the top, so
  // the authority of the mark is established before the breakdown.
  const markingModeBanner = (
    <>
      {result.marking_mode === 'official_mark_scheme' && result.detected_paper && (
        <div className="ec-banner ec-banner-success">
          <span className="ec-banner__icon inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]" aria-hidden>✓</span>
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
          <span className="ec-banner__icon mt-0.5 inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[color-mix(in_srgb,var(--ec-chip-critical-text)_40%,transparent)] bg-[color-mix(in_srgb,var(--ec-chip-critical-text)_12%,transparent)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-chip-critical-text)]" aria-hidden>!</span>
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
              We marked your answer using general {boardLabel} criteria. Think
              we should add this paper? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {result.marking_mode === 'general_criteria_practice' && (
        <div className="ec-banner ec-banner-info">
          <span className="ec-banner__icon inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-text-secondary)]" aria-hidden>i</span>
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
          <span className="ec-banner__icon inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-text-secondary)]" aria-hidden>i</span>
          <div>
            <p className="ec-banner__title">
              Marked with general {boardLabel} criteria
            </p>
            <p className="ec-banner__meta">
              This was not detected as {boardArticle} past paper question
            </p>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="ms-marking-result min-w-0">
      <div className="ms-mark-result-head">
        <div>
          {overline ? (
            <p className="ms-overline" style={{ marginBottom: 8 }}>
              {overline}
            </p>
          ) : null}
          {/* MarkSeoIntro in the /mark layout keeps the page h1. Focus target after mark. */}
          <h2 id="mark-result-heading" className="sr-only" tabIndex={-1}>
            {result.marks_earned} / {result.total_marks} —{' '}
            {resultSubheading(result.marks_earned, result.total_marks)}
          </h2>
          <ScoreReveal
            marksEarned={result.marks_earned}
            totalMarks={result.total_marks}
            percentage={percentage}
            grade={isIb ? null : grade.grade}
            nextGrade={nextGradeStep}
            activeMarkId={String(
              marks[selectedIndex]?.mark_id ?? selectedIndex
            )}
            marks={marks.map((m, i) => ({
              id: String(m.mark_id ?? i),
              earned: !!m.earned,
              label: m.type?.trim() || `Mark ${i + 1}`,
              reason: m.earned
                ? null
                : m.reasoning?.trim()
                  ? m.reasoning.trim().length > 140
                    ? `${m.reasoning.trim().slice(0, 137)}…`
                    : m.reasoning.trim()
                  : null,
            }))}
            report={{
              subjectLabel:
                getSubjectByCode(badgeSubjectCode ?? '')?.label ??
                badgeSubjectCode ??
                null,
              paperRef: overline,
              topics: [
                ...(result.ai_marking?.weak_topics ?? []),
                ...(result.syllabus_tags ?? []).map(String),
              ].filter(Boolean).slice(0, 6),
            }}
            onSelectMark={(id) => {
              const idx = marks.findIndex(
                (m, i) => String(m.mark_id ?? i) === id
              )
              if (idx >= 0) setSelectedIndex(idx)
            }}
          />
        </div>
      </div>

      {/* MK-05 outcome layer: score → verdict → recover → act → evidence. */}
      <div className="ms-mark-verdict mt-5">
        <p className="ms-micro" style={{ marginBottom: 10 }}>
          VERDICT
        </p>
        <h2 className="ms-h3">What the examiner saw</h2>
        <div className="leading-relaxed text-[var(--ec-text-secondary)]">
          <RichTextRenderer text={result.ai_marking?.summary ?? ''} />
        </div>
      </div>

      <div className="ms-mark-authority mt-4">{markingModeBanner}</div>

      {bandLadderShown && bandGap ? (
        <div className="mt-6">
          <MarkBandLadder
            gap={bandGap}
            justification={result.ai_marking.band_result?.justification}
          />
        </div>
      ) : null}

      {hasStructuredResult ? (
        <div className="mt-6">
          <MarkGapPanel
            gap={markGap}
            activeMarkId={activeMarkId}
            onSelectMark={handleInkMarkSelect}
          />
        </div>
      ) : null}

      {showRewriteTeaser ? (
        <div className="mt-6">
          <FullMarksRewriteTeaser diagnosis={postMarkDiagnosis} />
        </div>
      ) : null}

      {result.ai_marking.full_marks_rewrite ? (
        <div className="mt-6">
          <FullMarksRewritePanel rewrite={result.ai_marking.full_marks_rewrite} />
        </div>
      ) : null}

      {primaryAction ? (
        <div className="ms-mark-primary-action mt-7">{primaryAction}</div>
      ) : null}

      {hasStructuredResult || showAudit || hasCriteria ? (
        <Disclosure
          className="ms-mark-evidence mt-7"
          summaryClassName="ms-mark-evidence__summary"
          summary={
            <>
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                INK
              </span>
              See mark-by-mark evidence
            </>
          }
          hint="script, audit, scheme"
        >
          <div className="ms-result-grid mt-4">
            {hasStructuredResult ? (
              <div>
                {inkPages && inkPages.length > 0 ? (
                  <div className="ms-mark-ink-block">
                    <ExaminerInkPerPage
                      pages={inkPages}
                      attemptId={attemptId ?? undefined}
                      animate
                      activeRefId={activeInkKey}
                      onActiveMarkChange={handleInkRefSelect}
                      ghostFixes={ghostFixes}
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
                          <MarkSnippet
                            text={mark.margin_note}
                            className="ms-mark-snippet--inline"
                          />
                        ) : undefined
                      }
                      noteOk={mark.earned}
                      active={selectedIndex === i}
                      onClick={() => setSelectedIndex(i)}
                    />
                  ))}
                </ExamSheet>
                <p className="ms-micro" style={{ marginTop: 14 }}>
                  TAP ANY LINE — THE AUDIT AND SCHEME CITATION FOLLOW IT
                </p>
              </div>
            ) : null}

            {showAudit ? (
              <MarkAuditPanel
                marks={marks}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                marksEarned={result.marks_earned}
                totalMarks={result.total_marks}
                gradeLabel={isIb ? null : grade.grade}
                schemeLabel={schemeLabel(result)}
                bandResult={
                  bandLadderShown ? undefined : result.ai_marking.band_result
                }
                criteriaResults={result.ai_marking.criteria_results}
                rubric={result.mark_scheme_rubric}
              />
            ) : null}
            {result.mark_scheme_rubric &&
            result.marking_mode === 'official_mark_scheme' ? (
              <MarkSchemeRubricPanel
                rubric={result.mark_scheme_rubric}
                activeMarkType={activeMarkId}
                compact
                hideBands={bandLadderShown}
              />
            ) : null}
          </div>
        </Disclosure>
      ) : null}

      <Disclosure
        className="ms-mark-more mt-6"
        summaryClassName="ms-mark-more__summary"
        summary="More about this mark"
        hint="topics, notes, extras"
      >
        <div className="ms-mark-secondary mt-4">
          <QuestionContextCard result={result} subjectCode={badgeSubjectCode} />

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
              <div className="ec-card ec-card--paper p-5 sm:p-7">
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

          {isPaid && badgeSubjectCode && (
            <WeakSpotDrillCard subjectCode={badgeSubjectCode} />
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
                <pre className="ec-card ec-card--paper mt-2 max-w-full overflow-x-auto break-words whitespace-pre-wrap border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-4 font-mono text-xs text-[var(--ec-text-secondary)]">
                  {result.ocr_text}
                </pre>
              )}
            </div>
          )}
        </div>
      </Disclosure>
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
    <div className="ec-card ec-card--paper border-[var(--ec-brand)]/30 p-5 sm:p-7">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-grid h-6 min-w-6 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1.5 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
          aria-hidden
        >
          A*
        </span>
        <p className="ms-micro" style={{ margin: 0 }}>
          REWRITTEN TO FULL MARKS
        </p>
      </div>
      <h3 className="ms-h3">Your answer, taken to full marks</h3>
      <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
        Your own answer, rewritten to show exactly what earns every mark.
      </p>
      <div className="ec-card ec-card--paper border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-4 leading-relaxed text-[var(--ec-text-primary)]">
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
function FullMarksRewriteTeaser({
  diagnosis,
}: {
  diagnosis: PostMarkDiagnosis | null
}) {
  return (
    <div className="ec-card ec-card--paper relative overflow-hidden border-[var(--ec-brand)]/30 p-5 sm:p-7">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]" aria-hidden>L</span>
        <p className="ms-micro" style={{ margin: 0 }}>
          PREMIUM
        </p>
      </div>
      {/* Lead with the student's own diagnosis rather than the feature name.
          The ask lands at the highest-emotion moment in the product, and at
          that moment "here is the pattern in what you just lost" is the only
          sentence that earns the next one. The generic pitch follows it. */}
      {diagnosis ? (
        <>
          <h3 className="ms-h3">{diagnosis.headline}</h3>
          {diagnosis.detail && (
            <p className="mt-1 leading-relaxed text-[var(--ec-text-secondary)]">
              {diagnosis.detail}
            </p>
          )}
          <p className="mt-3 leading-relaxed text-[var(--ec-text-secondary)]">
            Premium rewrites <em>your</em> answer into one that scores full marks —
            keeping what you got right and showing exactly what each missing mark
            needed, line by line.
          </p>
        </>
      ) : (
        <>
          <h3 className="ms-h3">See your answer rewritten to full marks</h3>
          <p className="mt-1 leading-relaxed text-[var(--ec-text-secondary)]">
            Premium rewrites <em>your</em> answer into a response that scores full
            marks — keeping what you got right and showing exactly what each missing
            mark needs, line by line.
          </p>
        </>
      )}
      <div
        aria-hidden
        className="ec-card ec-card--paper mt-4 space-y-2 border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-4 opacity-40 select-none"
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
        <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
          A*
        </span>
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
    <div className="ec-card ec-card--paper border-[var(--ec-brand)]/25 p-6">
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
              <span className="text-[var(--ec-text-secondary)]">· {l.code}</span>
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
