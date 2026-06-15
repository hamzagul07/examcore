'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '1-2-1-multimedia-graphics'

export function MultimediaGraphicsDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Bitmap and vector graphics">
      <g opacity={layerOpacity(spec, stepIndex, 'bitmap')}>
        <text x="48" y="28" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Bitmap (raster)</text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={48 + (i % 3) * 14} y={36 + Math.floor(i / 3) * 14} width={12} height={12} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" />
        ))}
        <text x="48" y="78" fontSize="9" fill={DIAGRAM_TEXT}>800×600 × 24-bit colour depth</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'vector')}>
        <circle cx="300" cy="52" r="28" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="272" y1="80" x2="328" y2="24" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="300" y="100" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Vector — scale without blur</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'compression')}>
        <text x="48" y="120" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">JPEG lossy vs PNG lossless</text>
        <text x="48" y="138" fontSize="9" fill={DIAGRAM_TEXT}>Metadata: EXIF stores camera settings</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'filesize')}>
        <rect x="48" y="152" width="324" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Size ≈ width × height × bits per pixel ÷ 8</text>
      </g>
    </svg>
  )
}
