'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '6-1-data-security'

export function DataSecurityDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Data security controls">
      <g opacity={layerOpacity(spec, stepIndex, 'threats')}>
        {['Malware', 'Intercept', 'Access'].map((t, i) => (
          <rect key={t} x={36 + i * 110} y={28} width={96} height={32} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="84" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Malware</text>
        <text x="194" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Intercept</text>
        <text x="304" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Access</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'auth')}>
        <rect x="120" y="80" width="180" height="40" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="104" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Password + 2FA + biometrics</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'backup')}>
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT}>Full · Incremental · Off-site backup</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'physical')}>
        <text x="48" y="172" fontSize="10" fill={DIAGRAM_TEXT}>Physical: locks, CCTV, secure disposal</text>
      </g>
    </svg>
  )
}
