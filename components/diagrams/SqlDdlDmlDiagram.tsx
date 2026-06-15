'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '8-3-data-definition-language-ddl-and-data-manipulation-language-dml'

function sqlBlock(y: number, label: string, lines: string[]) {
  const h = 18 + lines.length * 14
  return (
    <g>
      <rect x="48" y={y} width="324" height={h} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x="56" y={y + 14} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      {lines.map((line, i) => (
        <text key={line} x="56" y={y + 28 + i * 14} fontSize="9" fill={DIAGRAM_TEXT} fontFamily="monospace">
          {line}
        </text>
      ))}
    </g>
  )
}

export function SqlDdlDmlDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="SQL DDL and DML statements"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'ddl')}>
        {sqlBlock(28, 'DDL — define structure', [
          'CREATE TABLE Student (',
          '  StudentID INT PRIMARY KEY,',
          '  Name VARCHAR(40) NOT NULL);',
        ])}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'dml-select')}>
        {sqlBlock(88, 'DML — query data', ['SELECT Name, Form FROM Student', 'WHERE Form = \'12A\';'])}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'dml-insert')}>
        <text x="48" y="158" fontSize="9" fill={DIAGRAM_TEXT} fontFamily="monospace">
          INSERT INTO Student VALUES (104, &apos;Ali&apos;, &apos;12A&apos;);
        </text>
        <text x="48" y="174" fontSize="9" fill={DIAGRAM_TEXT} fontFamily="monospace">
          UPDATE Student SET Form=&apos;12B&apos; WHERE StudentID=104;
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'constraints')}>
        <text x="48" y="198" fontSize="10" fill={DIAGRAM_TEXT}>
          PRIMARY KEY · FOREIGN KEY · NOT NULL · UNIQUE — enforce integrity
        </text>
      </g>
    </svg>
  )
}
