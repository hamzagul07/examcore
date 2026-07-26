'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-2-tok-essay-argument-and-evidence'
const BOX_FILL = 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'
const FAINT_FILL = 'color-mix(in srgb, var(--ec-brand) 6%, transparent)'

/**
 * The shape of a top-band essay argument: thesis → evidence → counter-claim →
 * evaluation.
 *
 * The first humanities diagram family. Every STEM family here draws a physical
 * or mathematical object; an essay has no such object, so what this draws is the
 * *structure the mark scheme rewards*. The gap between a mid-band and a top-band
 * essay is almost never more content — it is whether the counter-claim is
 * engaged with and the evaluation actually commits to a judgement. Those are the
 * two layers deliberately revealed last.
 *
 * Deliberately subject-neutral wording ("evidence", not "quotation" or
 * "source"), because the same skeleton is assessed in English A, History,
 * Global Politics, TOK and the Extended Essay.
 */
export function EssayArgumentMapDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  return (
    <svg
      viewBox="0 0 440 286"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Essay argument map: thesis, supporting evidence, counter-claim, then evaluation leading to a judgement"
    >
      {/* ── 1. Thesis ── */}
      <g opacity={op('step-1')}>
        <rect x="112" y="12" width="216" height="38" rx="7" fill={BOX_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.75" />
        <text x="220" y="28" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.08em">
          THESIS
        </text>
        <text x="220" y="42" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          answers the question — not a restatement
        </text>
      </g>

      {/* ── 2. Supporting evidence ── */}
      <g opacity={op('step-2')}>
        {/* stem down, then branch left */}
        <path d="M220 50 V70 H118 V88" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M114 82 L118 88 L122 82" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.08em">
          SUPPORT
        </text>
        {['specific evidence', 'specific evidence'].map((label, i) => {
          const y = 114 + i * 32
          return (
            <g key={i}>
              <rect x="30" y={y} width="176" height="26" rx="5" fill={FAINT_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.25" />
              <text x="118" y={y + 17} textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT}>
                {label} + analysis
              </text>
            </g>
          )
        })}
      </g>

      {/* ── 3. Counter-claim ── */}
      <g opacity={op('step-3')}>
        <path d="M220 50 V70 H322 V88" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M318 82 L322 88 L326 82" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="322" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.08em">
          COUNTER
        </text>
        <rect x="234" y="114" width="176" height="58" rx="5" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.25" strokeDasharray="4 3" />
        <text x="322" y="133" textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT}>
          the strongest opposing
        </text>
        <text x="322" y="146" textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT}>
          reading, stated fairly
        </text>
        <text x="322" y="162" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT} opacity="0.75">
          not a straw man
        </text>
      </g>

      {/* ── 4. Evaluation → judgement ── */}
      <g opacity={op('step-4')}>
        <path d="M118 178 V198 H220 V212" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M322 172 V198 H220" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M216 206 L220 212 L224 206" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="96" y="212" width="248" height="36" rx="7" fill={BOX_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.75" />
        <text x="220" y="228" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.08em">
          EVALUATION
        </text>
        <text x="220" y="241" textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT}>
          weigh both — then commit to a judgement
        </text>
        <text x="220" y="268" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} opacity="0.8">
          The top band is earned here, not in the amount of evidence.
        </text>
      </g>
    </svg>
  )
}
