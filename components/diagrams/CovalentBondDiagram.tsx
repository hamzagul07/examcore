'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '3-4-covalent-bonding-and-coordinate-dative-covalent-bonding'

function atom(cx: number, cy: number, label: string, r = 18) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="700">
        {label}
      </text>
    </>
  )
}

/** Covalent, dative, and dot-and-cross bonding for 9701 topics 3.4 and 3.7. */
export function CovalentBondDiagram({
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
      aria-label="Covalent bonding: shared electron pairs, dative bonds, and dot-and-cross diagrams"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Covalent bonding — shared electron pairs
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {atom(130, 100, 'H', 16)}
        {atom(290, 100, 'H', 16)}
        <ellipse cx="210" cy="100" rx="22" ry="12" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="210" y="104" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          ●●
        </text>
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          H₂ — one shared pair (single covalent bond)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {atom(210, 88, 'O', 18)}
        {atom(130, 118, 'O', 16)}
        {atom(290, 118, 'O', 16)}
        <line x1="148" y1="108" x2="192" y2="94" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <line x1="152" y1="114" x2="196" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="3" />
        <text x="210" y="168" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          O₂ — double bond (two shared pairs)
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {atom(210, 92, 'N', 18)}
        {atom(210, 42, 'H', 12)}
        {atom(268, 108, 'H', 12)}
        {atom(152, 108, 'H', 12)}
        {atom(210, 148, 'H', 12)}
        <line x1="210" y1="54" x2="210" y2="74" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="224" y1="100" x2="256" y2="106" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="196" y1="100" x2="164" y2="106" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="210" y1="110" x2="210" y2="136" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <path
          d="M 248 72 Q 280 78 290 100"
          fill="none"
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
          markerEnd="url(#dative-arrow)"
        />
        <text x="318" y="98" fontSize="10" fill={DIAGRAM_TEXT}>
          H⁺
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          NH₄⁺ — dative bond: both electrons from N
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="60" y="48" width="300" height="130" rx="4" fill="color-mix(in srgb, var(--ec-brand) 6%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="72" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Dot-and-cross rules (Paper 2)
        </text>
        <text x="210" y="96" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          × from one atom, ● from the other — only outer shell shown
        </text>
        <text x="210" y="118" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Ionic: transfer then [brackets] with charges
        </text>
        <text x="210" y="140" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Period 3 may expand octet (e.g. PCl₅, SF₆)
        </text>
      </g>

      <defs>
        <marker id="dative-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
