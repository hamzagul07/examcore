'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const SLUG = '4-2-assembly-language'

function codeLine(y: number, addr: string, mnemonic: string, operand: string) {
  return (
    <g>
      <text x="48" y={y} fontSize="9" fill={DIAGRAM_TEXT} fontFamily="monospace">
        {addr}
      </text>
      <text x="100" y={y} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600" fontFamily="monospace">
        {mnemonic}
      </text>
      <text x="160" y={y} fontSize="9" fill={DIAGRAM_TEXT} fontFamily="monospace">
        {operand}
      </text>
    </g>
  )
}

export function AssemblyLanguageDiagram({ className = '', stepIndex = 0 }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(SLUG)

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Assembly language mnemonics, opcodes, and registers"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'mnemonic')}>
        <text x="48" y="28" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Assembly listing
        </text>
        <rect x="40" y="36" width="340" height="72" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        {codeLine(52, '100:', 'LDR', '#5')}
        {codeLine(68, '101:', 'ADD', 'ACC, #3')}
        {codeLine(84, '102:', 'STR', 'RESULT')}
        {codeLine(100, '103:', 'HALT', '')}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'opcode')}>
        <text x="48" y="128" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          Mnemonic → machine opcode (1:1)
        </text>
        <text x="48" y="146" fontSize="9" fill={DIAGRAM_TEXT}>
          LDR #5 → 00110101 · assembler produces object code
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'registers')}>
        <rect x="260" y="112" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="320" y="132" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          ACC, IX, PC
        </text>
        <text x="320" y="148" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Special-purpose registers
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'fde')}>
        <text x="48" y="176" fontSize="10" fill={DIAGRAM_TEXT}>
          Fetch → Decode → Execute — PC points to next instruction
        </text>
        <text x="48" y="194" fontSize="9" fill={DIAGRAM_TEXT}>
          Low-level, hardware-specific — contrast with HLL + compiler
        </text>
      </g>
    </svg>
  )
}
