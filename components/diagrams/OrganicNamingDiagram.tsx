'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '13-1-formulas-functional-groups-and-the-naming-of-organic-compounds'

/** IUPAC naming and functional groups for 9701 topic 13.1. */
export function OrganicNamingDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Organic naming: homologous series, functional groups, and IUPAC rules"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Organic chemistry — naming and functional groups
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="80" y1="100" x2="340" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={100 + i * 50} cy={100} r="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        ))}
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Homologous series — same functional group, +CH₂ each step
        </text>
        <text x="210" y="148" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Alkanes CₙH₂ₙ₊₂ · Alkenes CₙH₂ₙ · Alcohols CₙH₂ₙ₊₁OH
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="110" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          –OH
        </text>
        <text x="170" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          –COOH
        </text>
        <text x="240" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          –CHO
        </text>
        <text x="300" y="88" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          –NH₂
        </text>
        <text x="210" y="130" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Suffix priority: –oic acid &gt; –al &gt; –ol &gt; –ane/–ene
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="96" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
          3-methylbutan-1-ol
        </text>
        <text x="210" y="122" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Longest chain · lowest locants · number from nearer end
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Displayed formula — every bond shown
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Skeletal formula for rings and chains — Paper 2 both required
        </text>
      </g>
    </svg>
  )
}
