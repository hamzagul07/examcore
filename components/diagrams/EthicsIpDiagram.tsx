'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '7-1-ethics-and-ownership'

export function EthicsIpDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Ethics and intellectual property">
      <g opacity={layerOpacity(spec, stepIndex, 'copyright')}>
        <rect x="48" y="32" width="140" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Copyright</text>
        <text x="118" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>expression</text>
        <rect x="232" y="32" width="140" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">Patent</text>
        <text x="302" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>invention</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'plagiarism')}>
        <text x="48" y="108" fontSize="10" fill={DIAGRAM_TEXT}>Cite sources — avoid plagiarism in coursework</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'conduct')}>
        <text x="48" y="132" fontSize="10" fill={DIAGRAM_TEXT}>Professional code: confidentiality, competence</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'ai-ethics')}>
        <text x="48" y="164" fontSize="10" fill={DIAGRAM_TEXT}>AI: bias, accountability, transparency</text>
      </g>
    </svg>
  )
}
