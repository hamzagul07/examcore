'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '1-2-2-multimedia-sound'

export function MultimediaSoundDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Sound digitisation: waveform, sampling, and bit depth"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'waveform')}>
        <text x="48" y="28" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Analogue sound wave
        </text>
        <path
          d="M 48 72 Q 88 40, 128 72 T 208 72 T 288 72 T 368 72"
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
        />
        <text x="48" y="92" fontSize="9" fill={DIAGRAM_TEXT}>
          Amplitude → loudness · frequency → pitch
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'sampling')}>
        <text x="48" y="112" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Sampling rate (Hz)
        </text>
        {[72, 112, 152, 192, 232, 272, 312, 352].map((x) => (
          <line key={x} x1={x} y1="56" x2={x} y2="88" stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="3 3" />
        ))}
        <text x="48" y="128" fontSize="9" fill={DIAGRAM_TEXT}>
          Nyquist: sample rate &gt; 2 × max frequency
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'bit-depth')}>
        <text x="48" y="152" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Bit depth — amplitude resolution
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={48 + i * 36} y={160} width={28} height={28} rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        ))}
        <text x="48" y="204" fontSize="9" fill={DIAGRAM_TEXT}>
          16-bit → 65 536 levels · higher depth = larger file
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'compression')}>
        <rect x="260" y="140" width="140" height="56" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="162" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          MP3 vs WAV
        </text>
        <text x="330" y="180" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Lossy (kbps) vs lossless PCM
        </text>
      </g>
    </svg>
  )
}
