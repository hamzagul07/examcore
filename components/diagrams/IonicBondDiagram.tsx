'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-2-ionic-bonding'

/** Ionic and metallic bonding for 9701 topics 3.2 and 3.3. */
export function IonicBondDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isMetallic = lessonSlug.includes('3-3')

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Ionic and metallic bonding: lattice structures and delocalised electrons"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {isMetallic ? 'Metallic bonding — delocalised electrons' : 'Ionic bonding — electron transfer'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {!isMetallic ? (
          <>
            <circle cx="130" cy="100" r="22" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
            <text x="130" y="104" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
              Na
            </text>
            <path d="M 160 100 L 200 100" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ion-arr)" />
            <text x="180" y="88" fontSize="9" fill={DIAGRAM_TEXT}>
              e⁻
            </text>
            <circle cx="290" cy="100" r="22" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
            <text x="290" y="104" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
              Cl
            </text>
          </>
        ) : (
          <>
            {[
              [140, 90],
              [190, 90],
              [240, 90],
              [140, 130],
              [190, 130],
              [240, 130],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="14" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
            ))}
            <text x="190" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
              M⁺
            </text>
          </>
        )}
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isMetallic ? 'Positive ion lattice in a sea of delocalised e⁻' : 'Metal loses e⁻; non-metal gains e⁻'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {!isMetallic ? (
          <>
            {[
              [150, 88],
              [210, 88],
              [150, 128],
              [210, 128],
            ].map(([x, y], i) => (
              <rect
                key={i}
                x={x - 14}
                y={y - 14}
                width="28"
                height="28"
                fill={i % 2 === 0 ? DIAGRAM_FILL : 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'}
                stroke={DIAGRAM_STROKE}
                strokeWidth="1.5"
              />
            ))}
            <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
              Giant lattice — NaCl 6:6 coordination
            </text>
          </>
        ) : (
          <>
            <path
              d="M 120 140 Q 190 70 260 140"
              fill="none"
              stroke={DIAGRAM_STROKE}
              strokeWidth="2"
              strokeDasharray="5 4"
              className="eq-anim-vec-a"
            />
            <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
              Non-directional — layers slide (malleable)
            </text>
          </>
        )}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isMetallic ? 'Conductivity — mobile delocalised electrons' : 'High mp · brittle · conduct when molten/aqueous'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="138" width="280" height="52" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="158" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {isMetallic ? 'Alloys disrupt the regular lattice — change hardness' : 'Lattice energy ↑ with smaller, higher-charge ions'}
        </text>
        <text x="210" y="176" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          {isMetallic ? 'Melting point varies with ion charge and size' : 'Born–Haber cycles at A Level (23.1)'}
        </text>
      </g>

      <defs>
        <marker id="ion-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
