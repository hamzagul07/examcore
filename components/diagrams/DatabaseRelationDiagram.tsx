'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '8-1-database-concepts'

function table(x: number, y: number, title: string, rows: string[]) {
  const h = 22 + rows.length * 16
  return (
    <g>
      <rect x={x} y={y} width={120} height={h} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <rect x={x} y={y} width={120} height={22} rx="6" fill="color-mix(in srgb, var(--ec-brand) 12%, var(--course-surface))" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 60} y={y + 15} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        {title}
      </text>
      {rows.map((row, i) => (
        <text key={row} x={x + 8} y={y + 38 + i * 16} fontSize="9" fill={DIAGRAM_TEXT}>
          {row}
        </text>
      ))}
    </g>
  )
}

export function DatabaseRelationDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Relational database tables, keys, and relationships"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'tables')}>
        {table(48, 40, 'STUDENT', ['StudentID (PK)', 'Name', 'Form'])}
        {table(252, 40, 'ENROLMENT', ['StudentID (FK)', 'CourseID (FK)', 'Grade'])}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'keys')}>
        <line x1="168" y1="70" x2="252" y2="70" stroke={DIAGRAM_STROKE} strokeWidth="1.5" markerEnd="url(#db-arrow)" />
        <text x="210" y="62" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          FK → PK
        </text>
        <text x="210" y="88" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Referential integrity
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'normalisation')}>
        <text x="48" y="148" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          1NF → atomic values
        </text>
        <text x="48" y="164" fontSize="10" fill={DIAGRAM_TEXT}>
          2NF → no partial key dependency
        </text>
        <text x="48" y="180" fontSize="10" fill={DIAGRAM_TEXT}>
          3NF → no transitive dependency
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'er-diagram')}>
        <ellipse cx="330" cy="160" rx="52" ry="24" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="164" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          COURSE
        </text>
        <line x1="312" y1="108" x2="330" y2="136" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="200" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          1:N enrolment
        </text>
      </g>

      <defs>
        <marker id="db-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0,0 6,3 0,6" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
