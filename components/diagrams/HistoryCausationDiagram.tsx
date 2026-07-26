'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '2-11-causes-and-effects-of-20th-century-wars'
const EVENT_FILL = 'color-mix(in srgb, var(--ec-brand) 14%, transparent)'
const CHIP_FILL = 'color-mix(in srgb, var(--ec-brand) 6%, transparent)'

function Chip({
  x,
  y,
  w,
  label,
  sub,
  dashed = false,
}: {
  x: number
  y: number
  w: number
  label: string
  sub?: string
  dashed?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={sub ? 30 : 24}
        rx="5"
        fill={CHIP_FILL}
        stroke={DIAGRAM_STROKE}
        strokeWidth="1.25"
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <text x={x + w / 2} y={sub ? y + 13 : y + 16} textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + 24} textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT} opacity="0.8">
          {sub}
        </text>
      ) : null}
    </g>
  )
}

/**
 * Historical causation — long-term causes, trigger, event, then consequences.
 *
 * The analytical frame IB History Paper 2 and 3 are actually marked on, and the
 * one these lessons name outright in their own objectives ("long-term,
 * short-term and immediate causes", "origins, development and impact",
 * "emergence, consolidation").
 *
 * Two exam traps are drawn deliberately rather than described: the trigger is
 * separated from the causes (mistaking the spark for the cause is the classic
 * mid-band error), and the closing layer is the weighting judgement, because
 * listing causes is a band below ranking them.
 */
export function HistoryCausationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  return (
    <svg
      viewBox="0 0 440 272"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Historical causation: long-term causes and an immediate trigger lead to the event, which produces short-term and long-term consequences"
    >
      {/* ── 1. Long-term causes ── */}
      <g opacity={op('step-1')}>
        <text x="66" y="20" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.07em">
          LONG-TERM CAUSES
        </text>
        <Chip x={8} y={30} w={116} label="political / economic" sub="built up over years" />
        <Chip x={8} y={68} w={116} label="ideological / social" sub="conditions, not events" />
      </g>

      {/* ── 2. Trigger ── */}
      <g opacity={op('step-2')}>
        <Chip x={8} y={112} w={116} label="IMMEDIATE TRIGGER" sub="the spark — not the cause" dashed />
        <text x="66" y="158" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT} opacity="0.8">
          without the conditions above,
        </text>
        <text x="66" y="168" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT} opacity="0.8">
          the trigger changes nothing
        </text>
      </g>

      {/* ── 3. Event → short-term consequences ── */}
      <g opacity={op('step-3')}>
        <path d="M124 62 H170" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M164 58 L170 62 L164 66" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M124 124 H150 V70 H170" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <rect x="170" y="42" width="100" height="56" rx="7" fill={EVENT_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.75" />
        <text x="220" y="66" textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT} fontWeight="600">
          THE EVENT
        </text>
        <text x="220" y="80" textAnchor="middle" fontSize="7.5" fill={DIAGRAM_TEXT} opacity="0.85">
          war / revolution / regime
        </text>

        <path d="M270 70 H310" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M304 66 L310 70 L304 74" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="374" y="20" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.07em">
          CONSEQUENCES
        </text>
        <Chip x={316} y={30} w={116} label="short-term" sub="immediate aftermath" />
      </g>

      {/* ── 4. Long-term consequences + weighting ── */}
      <g opacity={op('step-4')}>
        <path d="M374 60 V78" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <path d="M370 72 L374 78 L378 72" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <Chip x={316} y={80} w={116} label="long-term" sub="structural change" />
        <Chip x={316} y={122} w={116} label="contested" sub="historians disagree" dashed />

        <rect x="60" y="196" width="320" height="34" rx="7" fill={EVENT_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.75" />
        <text x="220" y="211" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT} fontWeight="600" letterSpacing="0.07em">
          WEIGH THE CAUSES
        </text>
        <text x="220" y="223" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          which mattered most, and why?
        </text>
        <text x="220" y="252" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} opacity="0.8">
          Listing causes is one band. Ranking them is the next.
        </text>
      </g>
    </svg>
  )
}
