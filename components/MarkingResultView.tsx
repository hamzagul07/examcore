'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { MathText } from '@/components/MathText'
import { SyllabusTopicBadge } from '@/components/SyllabusTopicBadge'
import { AnimatedScore } from '@/components/effects/AnimatedScore'
import { Progress } from '@/components/ui/Progress'
import type { SyllabusCode } from '@/lib/syllabus'
import {
  ERROR_LABELS,
  normalizeErrorClassification,
} from '@/lib/error-classifications'

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
  }
  ocr_text?: string | null
  question_text?: string | null
  marking_mode:
    | 'official_mark_scheme'
    | 'general_criteria_paper_not_in_db'
    | 'general_criteria'
  detected_paper?: {
    paper_code: string
    paper_session: string
    question_number: string
  } | null
  syllabus_tags?: SyllabusCode[] | null
}

export function MarkingResultView({ result }: { result: MarkingResultData }) {
  const [showOCR, setShowOCR] = useState(false)

  const percentage = Math.round((result.marks_earned / result.total_marks) * 100)

  return (
    <div className="space-y-6">
      {/* Score header — massive gradient number on dark with dramatic glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="ec-card-brand relative overflow-hidden p-8 text-center sm:p-14"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-emerald-500/30 blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-violet-500/25 blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-1/3 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-[90px]"
          aria-hidden="true"
        />
        <div className="relative">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="ec-label-tech mb-8 justify-center"
            style={{ display: 'inline-flex' }}
          >
            YOUR SCORE
          </motion.p>

          <div className="brand-breathe">
            <AnimatedScore
              earned={result.marks_earned}
              total={result.total_marks}
              caption="marks earned"
            />
          </div>

          <div className="mx-auto mt-10 max-w-sm">
            <Progress
              value={percentage}
              variant={
                percentage === 100
                  ? 'emerald'
                  : percentage >= 50
                  ? 'gradient'
                  : 'spectrum'
              }
              size="lg"
              ariaLabel="Score percentage"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
              className="mt-4 font-mono text-base font-semibold text-emerald-400"
            >
              {percentage}%
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Marking-mode banner */}
      {result.marking_mode === 'official_mark_scheme' && result.detected_paper && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 backdrop-blur shadow-[0_0_24px_rgba(16,185,129,0.15)]">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-200">
              Marked with official Cambridge mark scheme
            </p>
            <p className="mt-0.5 font-mono text-xs text-emerald-400">
              {result.detected_paper.paper_code} •{' '}
              {result.detected_paper.paper_session} • Question{' '}
              {result.detected_paper.question_number}
            </p>
          </div>
        </div>
      )}

      {result.marking_mode === 'general_criteria_paper_not_in_db' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200">
                This past paper is not in our database yet
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-300/80">
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
                  href="mailto:hello@examcore.ai"
                  className="font-medium underline"
                >
                  hello@examcore.ai
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {result.marking_mode === 'general_criteria' && (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 backdrop-blur">
          <Info className="h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <p className="text-sm font-semibold text-cyan-200">
              Marked with general A-Level criteria
            </p>
            <p className="mt-0.5 text-xs text-cyan-400">
              This was not detected as a Cambridge past paper question
            </p>
          </div>
        </div>
      )}

      {result.syllabus_tags && result.syllabus_tags.length > 0 && (
        <div>
          <p className="ec-label-tech mb-3">TOPICS COVERED</p>
          <div className="flex flex-wrap gap-2">
            {result.syllabus_tags.map((code) => (
              <SyllabusTopicBadge key={code} code={code} size="md" />
            ))}
          </div>
        </div>
      )}

      {result.question_text && (
        <div className="ec-card-premium p-5 sm:p-7">
          <p className="ec-label-tech mb-3">QUESTION (AS READ)</p>
          <div className="ec-question-text whitespace-pre-wrap text-base">
            <MathText text={result.question_text} />
          </div>
        </div>
      )}

      <div>
        <p className="ec-label-tech mb-3">SUMMARY</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          What the examiner saw
        </h2>
        <div className="leading-relaxed text-slate-300">
          <MathText text={result.ai_marking.summary} />
        </div>
      </div>

      {result.ai_marking.estimated_marks_explanation && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 backdrop-blur">
          <strong className="font-semibold text-amber-100">Marking note:</strong>{' '}
          <MathText text={result.ai_marking.estimated_marks_explanation} />
        </div>
      )}

      <div>
        <p className="ec-label-tech mb-3">MARK BY MARK</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Breakdown
        </h2>
        <div className="space-y-3">
          {result.ai_marking.marks_awarded.map((mark, i) => (
            <motion.div
              key={mark.mark_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.9 + i * 0.08,
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
              }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={`rounded-2xl border p-5 backdrop-blur ${
                mark.earned
                  ? 'border-emerald-500/30 bg-emerald-500/[0.08] shadow-[0_8px_32px_-8px_rgba(16,185,129,0.3)]'
                  : 'border-red-500/30 bg-red-500/[0.08] shadow-[0_8px_32px_-8px_rgba(239,68,68,0.25)]'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${
                    mark.earned
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'border-red-500/40 bg-red-500/20 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  }`}
                >
                  {mark.type}
                </span>
                <span
                  className={`font-mono text-xs font-semibold uppercase tracking-[0.18em] ${
                    mark.earned ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {mark.earned ? 'Earned' : 'Not earned'}
                </span>
                <ErrorClassificationPill
                  earned={mark.earned}
                  classification={mark.error_classification}
                />
              </div>
              <div className="text-sm leading-relaxed text-slate-300">
                <MathText text={mark.reasoning} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {result.ai_marking.weak_topics &&
        result.ai_marking.weak_topics.length > 0 && (
          <div>
            <p className="ec-label-tech ec-label-tech-orange mb-3">TOPICS TO WORK ON</p>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Where you lost marks
            </h2>
            <ul className="space-y-2">
              {result.ai_marking.weak_topics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span>
                    <MathText text={topic} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {result.ai_marking.what_to_study_next && (
        <div className="ec-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-500/15 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/15 blur-[80px]" />
          <div className="relative">
            <p className="ec-label-tech ec-label-tech-cyan mb-3">WHAT TO STUDY NEXT</p>
            <div className="leading-relaxed text-slate-200">
              <MathText text={result.ai_marking.what_to_study_next} />
            </div>
          </div>
        </div>
      )}

      {result.ocr_text && (
        <div>
          <button
            type="button"
            onClick={() => setShowOCR(!showOCR)}
            className="font-mono text-xs font-medium text-slate-500 underline transition-colors hover:text-emerald-400"
          >
            {showOCR ? 'HIDE' : 'SHOW'} WHAT THE AI READ FROM YOUR HANDWRITING
          </button>
          {showOCR && (
            <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-dark-900/60 p-4 font-mono text-xs text-slate-400 backdrop-blur">
              {result.ocr_text}
            </pre>
          )}
        </div>
      )}
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
  // Earned marks always read "no_error"; we don't need a pill for those — the
  // green "Earned" pill already communicates it.
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
