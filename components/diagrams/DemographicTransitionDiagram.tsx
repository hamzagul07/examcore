'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-2-changing-populations'

// The design system recolours every diagram stroke to one theme ink (for
// cross-theme contrast), so the two rate lines are told apart by style, not
// colour: birth solid, death dashed, population dotted — with the shaded
// natural-increase region carrying the only colour.

/**
 * The Demographic Transition Model — the anchor diagram of population geography.
 *
 * Death rate falls first (stage 2) and birth rate follows (stage 3); the gap
 * between them is natural increase, which is why population booms mid-transition
 * and levels off once both rates are low. Stepped so a walkthrough can reveal
 * that causal order rather than dropping the whole graph at once.
 */
export function DemographicTransitionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  // Stage boundaries on the x-axis (5 stages), and the rate axis (smaller y = higher rate).
  const xs = [55, 126, 197, 268, 339, 410]
  const top = 34
  const base = 205

  // Birth rate: high plateau (stages 1–2), falls through stage 3, low after.
  const birth = 'M55,58 L197,58 C230,58 246,150 268,150 L410,156'
  // Death rate: high in stage 1, falls sharply in stage 2, low thereafter.
  const death = 'M55,58 C92,58 124,178 161,180 L410,184'
  // Natural-increase region between the two lines (widest in stages 2–3).
  const gap =
    '55,58 126,58 197,58 268,150 339,154 410,156 410,184 339,182 268,180 197,178 126,120 55,58'
  // Total population: low, rapid rise through the transition, then levels off.
  const pop = 'M55,196 C135,196 180,120 240,92 S345,70 410,80'

  return (
    <svg
      viewBox="0 0 440 260"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Demographic transition model: birth rate, death rate and total population across five stages"
    >
      {/* Axes */}
      <line x1={xs[0]} y1={base} x2={xs[5]} y2={base} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1={xs[0]} y1={top} x2={xs[0]} y2={base} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="12" y="120" fontSize="9" fill={DIAGRAM_TEXT} transform="rotate(-90 16 120)">
        Rate (per 1000)
      </text>

      {/* Stage bands + numbers */}
      <g opacity={op('stages')}>
        {[1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={xs[i]}
            y1={top}
            x2={xs[i]}
            y2={base}
            stroke={DIAGRAM_TEXT}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={(xs[i] + xs[i + 1]) / 2}
            y={base + 15}
            textAnchor="middle"
            fontSize="9"
            fill={DIAGRAM_TEXT}
          >
            Stage {i + 1}
          </text>
        ))}
      </g>

      {/* Natural increase (between the lines) */}
      <polygon
        points={gap}
        fill="color-mix(in srgb, var(--ec-brand) 24%, transparent)"
        stroke="none"
        opacity={op('natural-increase')}
      />

      {/* Death rate — dashed */}
      <g opacity={op('death')}>
        <path d={death} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" strokeDasharray="7 4" />
        <text x={xs[5] - 2} y="196" textAnchor="end" fontSize="9.5" fill={DIAGRAM_TEXT} fontWeight="600">
          Death rate
        </text>
      </g>

      {/* Birth rate — solid */}
      <g opacity={op('birth')}>
        <path d={birth} fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.25" />
        <text x={xs[5] - 2} y="146" textAnchor="end" fontSize="9.5" fill={DIAGRAM_TEXT} fontWeight="600">
          Birth rate
        </text>
      </g>

      {/* Natural-increase label */}
      <text x="205" y="112" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} opacity={op('natural-increase')}>
        natural increase
      </text>

      {/* Total population */}
      <g opacity={op('population')}>
        <path d={pop} fill="none" stroke={DIAGRAM_TEXT} strokeWidth="1.5" strokeDasharray="1.5 3.5" strokeLinecap="round" opacity="0.8" />
        <text x="250" y="60" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          total population
        </text>
      </g>
    </svg>
  )
}
