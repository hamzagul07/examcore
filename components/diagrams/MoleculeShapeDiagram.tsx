'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-5-shapes-of-molecules'

function bond(x1: number, y1: number, x2: number, y2: number, key: string) {
  return (
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={DIAGRAM_STROKE}
      strokeWidth="2.5"
    />
  )
}

function atom(cx: number, cy: number, label: string, r = 16) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        {label}
      </text>
    </>
  )
}

function lonePair(cx: number, cy: number, key: string) {
  return (
    <ellipse
      key={key}
      cx={cx}
      cy={cy}
      rx="14"
      ry="8"
      fill="none"
      stroke={DIAGRAM_STROKE}
      strokeWidth="1.5"
      strokeDasharray="4 3"
      opacity="0.75"
    />
  )
}

/** VSEPR shapes for 9701 bonding topics (3.5, 13.3, 29.3). */
export function MoleculeShapeDiagram({
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
      aria-label="VSEPR molecular shapes: electron pair repulsion predicts bond angles"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        VSEPR — minimise electron-pair repulsion
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {atom(120, 110, 'C')}
        {bond(120, 110, 120, 58, 'ch4-u')}
        {bond(120, 110, 168, 110, 'ch4-r')}
        {bond(120, 110, 120, 162, 'ch4-d')}
        {bond(120, 110, 72, 110, 'ch4-l')}
        {atom(120, 42, 'H', 12)}
        {atom(182, 110, 'H', 12)}
        {atom(120, 178, 'H', 12)}
        {atom(58, 110, 'H', 12)}
        <text x="120" y="198" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          CH₄ — tetrahedral, 109.5°
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {atom(300, 108, 'O')}
        {bond(300, 108, 252, 88, 'h2o-l')}
        {bond(300, 108, 348, 88, 'h2o-r')}
        {atom(238, 78, 'H', 12)}
        {atom(362, 78, 'H', 12)}
        {lonePair(278, 128, 'lp1')}
        {lonePair(322, 128, 'lp2')}
        <text x="300" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          H₂O — bent, ~104.5° (lone pairs compress angle)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="70" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Linear
        </text>
        {atom(70, 78, 'C', 12)}
        {bond(52, 78, 88, 78, 'co2-l')}
        {bond(70, 78, 110, 78, 'co2-r')}
        {atom(34, 78, 'O', 11)}
        {atom(110, 78, 'O', 11)}
        <text x="70" y="98" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          180°
        </text>

        <text x="210" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Trigonal planar
        </text>
        {atom(210, 88, 'B', 12)}
        {bond(210, 88, 210, 58, 'bf3-u')}
        {bond(210, 88, 238, 108, 'bf3-r')}
        {bond(210, 88, 182, 108, 'bf3-l')}
        {atom(210, 48, 'F', 10)}
        {atom(252, 118, 'F', 10)}
        {atom(168, 118, 'F', 10)}
        <text x="210" y="132" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          120°
        </text>

        <text x="350" y="52" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Tetrahedral
        </text>
        {atom(350, 88, 'C', 11)}
        {bond(350, 88, 350, 58, 't-u')}
        {bond(350, 88, 378, 108, 't-r')}
        {bond(350, 88, 322, 108, 't-l')}
        {atom(350, 48, 'H', 9)}
        {atom(392, 118, 'H', 9)}
        {atom(308, 118, 'H', 9)}
        <text x="350" y="132" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          109.5°
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect
          x="48"
          y="148"
          width="324"
          height="58"
          rx="4"
          fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)"
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
        />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Paper 2: use bond angles as evidence
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          NH₃ 107° · H₂O 104.5° · CO₂ 180° · count bp + lp domains first
        </text>
      </g>
    </svg>
  )
}
