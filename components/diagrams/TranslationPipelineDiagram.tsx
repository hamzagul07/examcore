'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '16-2-translation-software'

function stage(x: number, y: number, label: string, sub: string) {
  return (
    <g>
      <rect x={x} y={y} width={88} height={40} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 44} y={y + 18} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        {label}
      </text>
      <text x={x + 44} y={y + 32} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
        {sub}
      </text>
    </g>
  )
}

export function TranslationPipelineDiagram({
  className = '',
  stepIndex = 0,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Compiler, interpreter, assembler, and linker pipelines"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'assembler')}>
        {stage(36, 36, 'Source', 'asm')}
        <text x="140" y="58" fontSize="14" fill={DIAGRAM_STROKE}>
          →
        </text>
        {stage(156, 36, 'Assembler', '1:1 opcode')}
        <text x="260" y="58" fontSize="14" fill={DIAGRAM_STROKE}>
          →
        </text>
        {stage(276, 36, 'Machine', 'binary')}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'compiler')}>
        {stage(36, 96, 'Source', 'HLL')}
        <text x="140" y="118" fontSize="14" fill={DIAGRAM_STROKE}>
          →
        </text>
        {stage(156, 96, 'Compiler', 'all at once')}
        <text x="260" y="118" fontSize="14" fill={DIAGRAM_STROKE}>
          →
        </text>
        {stage(276, 96, 'Object', '.obj')}
        <text x="210" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Fast runtime — compile before execution
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'interpreter')}>
        <line x1="60" y1="168" x2="120" y2="168" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="120" y="152" width="100" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="170" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Interpreter
        </text>
        <path d="M 230 168 L 280 168 L 280 188 L 250 188 L 250 168" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="200" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Line-by-line — easier debugging, slower run
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'linker')}>
        <rect x="300" y="152" width="84" height="32" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="342" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          Linker
        </text>
        <text x="342" y="132" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          .obj + libs → .exe
        </text>
      </g>
    </svg>
  )
}
