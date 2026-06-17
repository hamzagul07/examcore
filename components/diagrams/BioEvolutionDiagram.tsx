'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '17-3-evolution'
const STEPS = [
  'Variation in population',
  'Selection pressure',
  'Best-adapted survive & breed',
  'Advantageous alleles rise',
]

/** Natural selection drives evolution by changing allele frequencies. */
export function BioEvolutionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Natural selection and evolution">
      <defs>
        <marker id="bio-evo-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
      {STEPS.map((s, i) => {
        const y = 36 + i * 46
        return (
          <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
            <rect x="80" y={y} width="260" height="34" rx="8" fill={i === STEPS.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === STEPS.length - 1 ? 0.12 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x="210" y={y + 22} textAnchor="middle" fontSize="9.5" fill={DIAGRAM_TEXT} fontWeight={i === STEPS.length - 1 ? 600 : 400}>{s}</text>
            {i < STEPS.length - 1 && (
              <line x1="210" y1={y + 34} x2="210" y2={y + 46} stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#bio-evo-arrow)" />
            )}
          </g>
        )
      })}
      <text x="70" y="228" fontSize="9" fill={DIAGRAM_TEXT}>Over generations, allele frequencies shift — the population evolves.</text>
    </svg>
  )
}
