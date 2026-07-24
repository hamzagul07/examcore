'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-3-trees-and-binary-trees'
const NODE_FILL = 'color-mix(in srgb, var(--ec-brand) 12%, transparent)'

type N = { id: string; x: number; y: number; v: string }
const ROOT: N = { id: 'r', x: 220, y: 46, v: '8' }
const CHILDREN: N[] = [
  { id: 'l', x: 140, y: 108, v: '3' },
  { id: 'rt', x: 300, y: 108, v: '12' },
]
const LEAVES: N[] = [
  { id: 'll', x: 96, y: 168, v: '1' },
  { id: 'lr', x: 184, y: 168, v: '6' },
  { id: 'rl', x: 256, y: 168, v: '10' },
  { id: 'rr', x: 344, y: 168, v: '14' },
]

/**
 * A binary tree — a root, each node with up to two children, leaves at the tips.
 *
 * Stepped: the root, then its two children (and the edges), then the leaves and
 * the height — the longest path from root to leaf.
 */
export function BinaryTreeDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const op = (id: string) => layerOpacity(spec, stepIndex, id)

  const node = (n: N) => (
    <g key={n.id}>
      <circle cx={n.x} cy={n.y} r="15" fill={NODE_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{n.v}</text>
    </g>
  )
  const edge = (a: N, b: N, key: string) => (
    <line key={key} x1={a.x} y1={a.y + 14} x2={b.x} y2={b.y - 14} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
  )

  return (
    <svg
      viewBox="0 0 440 210"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Binary tree with a root, internal nodes and leaves"
    >
      {/* Root */}
      <g opacity={op('step-1')}>
        {node(ROOT)}
        <text x={ROOT.x + 22} y={ROOT.y + 2} fontSize="8.5" fill={DIAGRAM_TEXT}>root</text>
      </g>

      {/* Children + edges */}
      <g opacity={op('step-2')}>
        {edge(ROOT, CHILDREN[0], 'e-l')}
        {edge(ROOT, CHILDREN[1], 'e-r')}
        {CHILDREN.map(node)}
      </g>

      {/* Leaves + edges + height */}
      <g opacity={op('step-3')}>
        {edge(CHILDREN[0], LEAVES[0], 'e-ll')}
        {edge(CHILDREN[0], LEAVES[1], 'e-lr')}
        {edge(CHILDREN[1], LEAVES[2], 'e-rl')}
        {edge(CHILDREN[1], LEAVES[3], 'e-rr')}
        {LEAVES.map(node)}
        <text x="220" y="200" textAnchor="middle" fontSize="8.5" fill={DIAGRAM_TEXT}>leaves — no children</text>
        {/* height bracket */}
        <line x1="30" y1={ROOT.y} x2="30" y2={LEAVES[0].y} stroke={DIAGRAM_STROKE} strokeWidth="1" strokeDasharray="3 3" />
        <text x="18" y={(ROOT.y + LEAVES[0].y) / 2} fontSize="8" fill={DIAGRAM_TEXT} transform={`rotate(-90 18 ${(ROOT.y + LEAVES[0].y) / 2})`}>height</text>
      </g>
    </svg>
  )
}
