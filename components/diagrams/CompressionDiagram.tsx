'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '1-3-compression'

export function CompressionDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Lossless and lossy compression techniques"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'lossless')}>
        <text x="48" y="32" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Lossless — exact reconstruction
        </text>
        <rect x="48" y="40" width="140" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="62" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Original 2.4 MB
        </text>
        <text x="200" y="62" fontSize="14" fill={DIAGRAM_STROKE}>
          →
        </text>
        <rect x="220" y="40" width="140" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="290" y="62" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          ZIP / PNG 1.1 MB
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'lossy')}>
        <text x="48" y="100" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Lossy — discard imperceptible detail
        </text>
        <text x="48" y="118" fontSize="9" fill={DIAGRAM_TEXT}>
          JPEG / MP3 — smaller file, some quality loss
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'run-length')}>
        <text x="48" y="140" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Run-length encoding (RLE)
        </text>
        <text x="48" y="158" fontSize="9" fill={DIAGRAM_TEXT}>
          AAAABBB → 4A3B · good for flat colour / repeated pixels
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'exam-size')}>
        <rect x="48" y="172" width="324" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="194" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          File size ≈ rate × depth × duration (sound) or pixels × depth (image)
        </text>
      </g>
    </svg>
  )
}
