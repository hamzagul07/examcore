'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '17-1-encryption-encryption-protocols-and-digital-certificates'

export function EncryptionDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Encryption and digital certificates">
      <g opacity={layerOpacity(spec, stepIndex, 'symmetric')}>
        <rect x="48" y="28" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Same key encrypt/decrypt</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'asymmetric')}>
        <text x="240" y="44" fontSize="10" fill={DIAGRAM_TEXT}>Public key → encrypt</text>
        <text x="240" y="60" fontSize="10" fill={DIAGRAM_TEXT}>Private key → decrypt</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'hash')}>
        <rect x="48" y="88" width="324" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="108" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>SHA hash — one-way, detect tampering</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'certificate')}>
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT}>CA signs certificate → HTTPS / TLS</text>
      </g>
    </svg>
  )
}
