'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '30-1-arenes'

export function AreneDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isPhenol = lessonSlug.includes('32-2')

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Arenes and phenol: electrophilic substitution">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">{isPhenol ? 'Phenol — activated benzene ring' : 'Arenes — benzene & electrophilic substitution'}</text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <polygon points="210,58 248,78 248,118 210,138 172,118 172,78" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <circle cx="210" cy="98" r="14" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>Delocalised π system — resist addition, favour substitution</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isPhenol ? '–OH activates ring · ortho/para directing' : 'Electrophilic substitution: nitration · halogenation · Friedel–Crafts'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{isPhenol ? 'Weak acid — phenoxide stabilised by ring' : 'Methylbenzene · nitrobenzene — directing groups (o/p vs m)'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Curly arrow from ring to E⁺ — σ-complex intermediate</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Halogen carrier AlCl₃ or FeCl₃ required</text>
      </g>
    </svg>
  )
}
