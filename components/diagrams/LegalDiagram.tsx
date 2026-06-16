'use client'

import type { ReactNode } from 'react'
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

function adrView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const methods = ['Negotiation', 'Mediation', 'Arbitration', 'Litigation']
  return (
    <>
      <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Dispute resolution ladder
      </text>
      {methods.map((m, i) => (
        <g key={m} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={48 + i * 84} y="48" width="72" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={84 + i * 84} y="72" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
            {m}
          </text>
          {i < methods.length - 1 ? (
            <path d={`M ${120 + i * 84} 68 L ${132 + i * 84} 68`} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          ) : null}
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          ADR avoids court cost · binding arbitration vs voluntary mediation
        </text>
      </g>
    </>
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

function precedentView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const courts = [
    { y: 28, w: 200, label: 'Supreme Court' },
    { y: 68, w: 168, label: 'Court of Appeal' },
    { y: 108, w: 136, label: 'High Court' },
    { y: 148, w: 104, label: 'Lower courts' },
  ]
  return (
    <>
      <text x="210" y="16" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Court hierarchy &amp; precedent
      </text>
      {courts.map((c, i) => (
        <g key={c.label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={210 - c.w / 2} y={c.y} width={c.w} height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x="210" y={c.y + 20} textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
            {c.label}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Ratio decidendi binds · obiter dicta persuasive only
        </text>
      </g>
    </>
  )
}

function interpretationView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const rules = ['Literal', 'Golden', 'Mischief', 'Purposive']
  return (
    <>
      <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Statutory interpretation
      </text>
      {rules.map((r, i) => (
        <g key={r} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={48 + i * 84} y="48" width="72" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={84 + i * 84} y="72" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {r}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Intrinsic aids — text · headings · punctuation
        </text>
        <text x="210" y="140" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Extrinsic aids — Hansard · dictionaries · previous statutes
        </text>
      </g>
    </>
  )
}

function remediesView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="140" height="56" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Damages
        </text>
        <text x="118" y="90" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Compensatory · punitive
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="232" y="48" width="140" height="56" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Injunction
        </text>
        <text x="302" y="90" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Prohibitory · mandatory
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="140" y="120" width="140" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="144" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Specific performance
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="184" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Aim to put claimant in pre-breach position — remoteness limits recovery
        </text>
      </g>
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

  let content: ReactNode
  if (family === 'law-precedent') content = precedentView(spec, stepIndex)
  else if (family === 'law-interpretation') content = interpretationView(spec, stepIndex)
  else if (family === 'law-remedies') content = remediesView(spec, stepIndex)
  else if (family === 'law-adr') content = adrView(spec, stepIndex)
  else if (family === 'law-system-process') content = systemView(spec, stepIndex)
  else if (family === 'law-contract-elements') content = elementsChain(spec, stepIndex, contractLabels)
  else if (family === 'law-criminal-elements') content = elementsChain(spec, stepIndex, criminalLabels)
  else content = elementsChain(spec, stepIndex, tortLabels)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Law concept diagram"
    >
      {content}
    </svg>
  )
}
