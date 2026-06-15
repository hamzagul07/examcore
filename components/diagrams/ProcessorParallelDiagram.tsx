'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '15-1-processors-parallel-processing-and-virtual-machines'

export function ProcessorParallelDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)
  return (
    <svg viewBox="0 0 420 200" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Processors and parallel processing">
      <g opacity={layerOpacity(spec, stepIndex, 'fde')}>
        {['Fetch', 'Decode', 'Execute'].map((s, i) => (
          <rect key={s} x={48 + i * 72} y={28} width={64} height={32} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="80" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Fetch</text>
        <text x="152" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Decode</text>
        <text x="224" y="48" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Execute</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'multicore')}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={48 + (i % 2) * 80} y={80 + Math.floor(i / 2) * 44} width={72} height={36} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="210" y="108" fontSize="10" fill={DIAGRAM_TEXT}>Multi-core — true parallelism</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'vm')}>
        <rect x="280" y="72" width="120" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="340" y="96" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>Hypervisor</text>
        <text x="340" y="112" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>Guest OS</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'parallel')}>
        <text x="48" y="184" fontSize="10" fill={DIAGRAM_TEXT}>SIMD (GPU) vs MIMD (multi-core CPU)</text>
      </g>
    </svg>
  )
}
