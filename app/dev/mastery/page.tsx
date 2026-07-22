'use client'

import { useState } from 'react'
import { MasteryHeatmap } from '@/components/progress/MasteryHeatmap'
import type { LeafMastery, MasteryLevel, ParentMastery } from '@/lib/mastery'

/**
 * Visual harness for the mastery heatmap. /dashboard/progress is auth-gated, so
 * fixtures are the only way to actually look at this rather than reason about
 * it. Mirrors /dev/diagrams and /dev/momentum.
 *
 * Client component so cell clicks can be exercised; metadata lives in
 * layout-level defaults, and /dev is excluded from search by convention.
 */

function leaf(
  code: string,
  name: string,
  paper: string,
  paperName: string,
  level: MasteryLevel,
  percentage: number,
  attemptsCount: number
): LeafMastery {
  return {
    code,
    name,
    paper,
    paperName,
    parent: { code: `${paper}.p`, name: 'Parent topic' },
    level,
    percentage,
    attemptsCount,
    totalMarksEarned: Math.round((percentage / 100) * attemptsCount * 8),
    totalMarksAvailable: attemptsCount * 8,
  }
}

const LEVELS: Array<[MasteryLevel, number, number]> = [
  ['exam_ready', 92, 5],
  ['exam_ready', 86, 4],
  ['proficient', 71, 4],
  ['proficient', 64, 3],
  ['critical', 38, 3],
  ['critical', 45, 4],
  ['sampled', 75, 1],
  ['unattempted', 0, 0],
  ['unattempted', 0, 0],
  ['unattempted', 0, 0],
]

function paperOf(paper: string, paperName: string, n: number): ParentMastery {
  const leaves = Array.from({ length: n }, (_, i) => {
    const [level, pct, attempts] = LEVELS[i % LEVELS.length]
    return leaf(
      `${paper}.${i + 1}`,
      `${paperName} topic ${i + 1}`,
      paper,
      paperName,
      level,
      pct,
      attempts
    )
  })
  return {
    code: `${paper}.parent`,
    name: `${paper} topics`,
    paper,
    paperName,
    leaves,
    level: 'proficient',
    leafCounts: {
      unattempted: 0,
      sampled: 0,
      critical: 0,
      proficient: 0,
      exam_ready: 0,
    },
    averagePercentage: 65,
  }
}

const CASES: Array<{ title: string; data: ParentMastery[] }> = [
  {
    title: 'Full subject — four papers, mixed mastery',
    data: [
      paperOf('P1', 'Pure Mathematics 1', 18),
      paperOf('P3', 'Pure Mathematics 3', 22),
      paperOf('P4', 'Mechanics', 11),
      paperOf('P6', 'Probability & Statistics', 14),
    ],
  },
  {
    title: 'Just started — mostly untouched',
    data: [
      {
        ...paperOf('P1', 'Pure Mathematics 1', 12),
        leaves: Array.from({ length: 12 }, (_, i) =>
          leaf(
            `P1.${i}`,
            `Topic ${i + 1}`,
            'P1',
            'Pure Mathematics 1',
            i === 0 ? 'sampled' : 'unattempted',
            i === 0 ? 62 : 0,
            i === 0 ? 1 : 0
          )
        ),
      },
    ],
  },
]

export default function MasteryPreviewPage() {
  const [picked, setPicked] = useState<LeafMastery | null>(null)
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="ms-h2 mb-2">Mastery heatmap</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture states. Clicking a cell reports below (the real view opens the
        detail modal).
      </p>
      {picked && (
        <p className="ec-card mb-6 p-3 text-sm">
          selected: <strong>{picked.name}</strong> — {picked.level} ·{' '}
          {Math.round(picked.percentage)}%
        </p>
      )}
      {CASES.map((c) => (
        <div key={c.title} className="mb-12">
          <p className="ec-eyebrow mb-3">{c.title}</p>
          <div className="ec-card p-5">
            <MasteryHeatmap parentMasteries={c.data} onSelectLeaf={setPicked} />
          </div>
        </div>
      ))}
    </div>
  )
}
