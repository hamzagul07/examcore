'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function theoryView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const nodes = [
    { x: 210, y: 48, label: 'Functionalism' },
    { x: 72, y: 148, label: 'Conflict' },
    { x: 348, y: 148, label: 'Action / SI' },
  ]
  return (
    <>
      {nodes.map((n, i) => (
        <g key={n.label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <circle cx={n.x} cy={n.y} r="36" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {n.label}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Compare perspectives on structure, agency, and social change
        </text>
      </g>
    </>
  )
}

function researchView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="56" width="120" height="72" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Quantitative
        </text>
        <text x="108" y="108" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Surveys · stats
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="252" y="56" width="120" height="72" rx="8" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="312" y="88" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Qualitative
        </text>
        <text x="312" y="108" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Interviews · OBS
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Validity · reliability · ethics · representativeness
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="180" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Link method choice to research question and theoretical framework
        </text>
      </g>
    </>
  )
}

function familyView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const types = ['Nuclear', 'Extended', 'Lone-parent', 'Reconstituted']
  return (
    <>
      <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Family diversity
      </text>
      {types.map((t, i) => (
        <g key={t} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={48 + i * 84} y="48" width="72" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={84 + i * 84} y="72" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
            {t}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Functionalist vs Marxist vs feminist views on family roles
        </text>
      </g>
    </>
  )
}

function educationView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Functionalist
        </text>
        <text x="108" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Meritocracy · role allocation
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="252" y="48" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="312" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Marxist
        </text>
        <text x="312" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Reproduces inequality
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Class · gender · ethnicity gaps in attainment
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="148" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Hidden curriculum · labelling · self-fulfilling prophecy
        </text>
      </g>
    </>
  )
}

function mediaView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="140" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="118" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Hypodermic
        </text>
        <text x="118" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Direct · passive audience
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="232" y="48" width="140" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="302" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Uses &amp; gratifications
        </text>
        <text x="302" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Active · selective
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Representation — class · gender · ethnicity · age
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="148" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          New media — digital activism · echo chambers · global reach
        </text>
      </g>
    </>
  )
}

function globalisationView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <circle cx="210" cy="88" r="48" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="92" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Global flows
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        {['Trade', 'Migration', 'Culture', 'Ideas'].map((l, i) => {
          const angle = (i / 4) * Math.PI * 2 - Math.PI / 4
          const cx = 210 + Math.cos(angle) * 88
          const cy = 88 + Math.sin(angle) * 64
          return (
            <g key={l}>
              <line x1="210" y1="88" x2={cx} y2={cy} stroke={DIAGRAM_STROKE} strokeWidth="1" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
                {l}
              </text>
            </g>
          )
        })}
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="160" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Inequality · identity · hybrid cultures
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="184" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Hyper-globalist vs sceptic vs transformationalist views
        </text>
      </g>
    </>
  )
}

function religionView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="36" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Secularisation debate
        </text>
        <line x1="48" y1="160" x2="372" y2="160" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <polyline points="48,160 120,120 200,100 280,80 372,72" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="48" y="176" fontSize="8" fill={DIAGRAM_TEXT}>
          Time
        </text>
        <text x="20" y="100" fontSize="8" fill={DIAGRAM_TEXT}>
          Religiosity
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Church attendance · belief · religious institutions
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="140" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Religion as social control vs source of change
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Post-modernity — spiritual shopping · NRMs · gender and feminism
        </text>
      </g>
    </>
  )
}

export function SocialScienceDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '1-1-the-process-of-learning-and-socialisation',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'soc-theory'

  const view =
    family === 'soc-research'
      ? researchView
      : family === 'soc-family'
        ? familyView
        : family === 'soc-education'
          ? educationView
          : family === 'soc-media'
            ? mediaView
            : family === 'soc-globalisation'
              ? globalisationView
              : family === 'soc-religion'
                ? religionView
                : theoryView

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Sociology concept diagram"
    >
      {view(spec, stepIndex)}
    </svg>
  )
}
