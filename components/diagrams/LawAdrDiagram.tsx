'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-4-1-alternative-dispute-resolution'
const STEPS = ['Negotiation', 'Mediation', 'Arbitration', 'Litigation']

/** ADR ladder — formality, cost, and bindingness rise toward litigation. */
export function LawAdrDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  return (
    <svg viewBox="0 0 420 240" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Dispute resolution ladder from negotiation to litigation">
      <line x1="44" y1="190" x2="384" y2="190" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <line x1="44" y1="190" x2="44" y2="34" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="20" y="40" fontSize="8" fill={DIAGRAM_TEXT} transform="rotate(-90 20 40)">Cost · formality</text>
      {STEPS.map((s, i) => {
        const w = 74
        const x = 64 + i * 82
        const h = 30 + i * 32
        return (
          <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
            <rect x={x} y={190 - h} width={w} height={h} rx="4" fill={i === STEPS.length - 1 ? 'var(--ink, var(--ec-brand))' : DIAGRAM_FILL} fillOpacity={i === STEPS.length - 1 ? 0.14 : 1} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
            <text x={x + w / 2} y={184} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>{s}</text>
          </g>
        )
      })}
      <text x="60" y="212" fontSize="9" fill={DIAGRAM_TEXT}>ADR resolves disputes faster and cheaper than going to court.</text>
    </svg>
  )
}
