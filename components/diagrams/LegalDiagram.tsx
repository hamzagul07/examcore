'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function box(x: number, y: number, w: number, label: string) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        {label}
      </text>
    </g>
  )
}

function systemView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>{box(150, 24, 120, 'Parliament')}</g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>{box(150, 76, 120, 'Judiciary')}</g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        {box(48, 128, 100, 'Civil courts')}
        {box(272, 128, 100, 'Criminal courts')}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="188" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Precedent · statutory interpretation · ADR
        </text>
      </g>
      <line x1="210" y1="60" x2="210" y2="76" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
    </>
  )
}

function elementsChain(
  spec: ReturnType<typeof getLessonDiagramSpec>,
  stepIndex: number,
  labels: string[]
) {
  return (
    <>
      {labels.map((label, i) => (
        <g key={label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          {box(36 + i * 92, 72, 80, label)}
          {i < labels.length - 1 ? (
            <path d={`M ${116 + i * 92} 90 L ${128 + i * 92} 90`} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          ) : null}
        </g>
      ))}
    </>
  )
}

export function LegalDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '1-1-1-english-legal-system-and-its-context',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'law-system-process'

  const contractLabels = ['Offer', 'Acceptance', 'Consideration', 'Intention']
  const criminalLabels = ['Actus reus', 'Mens rea', 'Causation', 'Defences']
  const tortLabels = ['Duty', 'Breach', 'Causation', 'Remedy']

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Law concept diagram"
    >
      {family === 'law-system-process'
        ? systemView(spec, stepIndex)
        : family === 'law-contract-elements'
          ? elementsChain(spec, stepIndex, contractLabels)
          : family === 'law-criminal-elements'
            ? elementsChain(spec, stepIndex, criminalLabels)
            : elementsChain(spec, stepIndex, tortLabels)}
    </svg>
  )
}
