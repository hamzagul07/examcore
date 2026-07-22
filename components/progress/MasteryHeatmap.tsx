'use client'

import { useMemo } from 'react'
import type { LeafMastery, MasteryLevel, ParentMastery } from '@/lib/mastery'

/**
 * The mastery matrix, as an actual matrix.
 *
 * The existing view is an expandable list: accurate, but you cannot see the
 * SHAPE of your knowledge in it — which papers are solid, where the holes are —
 * without opening every section. This is the same data as a grid, so "what
 * should I work on?" is answered by looking rather than by reading.
 *
 * Form follows the job (dataviz method): comparing magnitude across a grid is a
 * HEATMAP. Mastery level is a STATUS, not a series, so it uses the reserved
 * status palette already used by the chips everywhere else — and status colour
 * never travels alone, so every attempted cell carries its score as text and
 * unattempted cells differ in SHAPE (dashed, empty) rather than only in hue.
 *
 * Evidence and performance are deliberately not on one ramp: "unattempted" and
 * "sampled" mean *we don't know yet*, which is a different thing from *this is
 * weak*. Collapsing them into a single low-to-high scale would tell students
 * they're bad at topics they simply haven't tried.
 */

const LEVEL_ORDER: MasteryLevel[] = [
  'exam_ready',
  'proficient',
  'critical',
  'sampled',
  'unattempted',
]

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  exam_ready: 'Exam ready',
  proficient: 'Proficient',
  critical: 'Needs work',
  sampled: 'Too few attempts',
  unattempted: 'Not started',
}

/** Token stem per level — resolved to bg/text CSS vars in the stylesheet. */
const LEVEL_TOKEN: Record<MasteryLevel, string> = {
  exam_ready: 'success',
  proficient: 'warning',
  critical: 'critical',
  sampled: 'sampled',
  unattempted: 'neutral',
}

export function MasteryHeatmap({
  parentMasteries,
  onSelectLeaf,
}: {
  parentMasteries: ParentMastery[]
  onSelectLeaf: (leaf: LeafMastery) => void
}) {
  const { papers, counts, total } = useMemo(() => {
    const byPaper = new Map<
      string,
      { paperName: string; leaves: LeafMastery[] }
    >()
    const tally: Record<MasteryLevel, number> = {
      exam_ready: 0,
      proficient: 0,
      critical: 0,
      sampled: 0,
      unattempted: 0,
    }

    for (const parent of parentMasteries) {
      const entry = byPaper.get(parent.paper) ?? {
        paperName: parent.paperName,
        leaves: [],
      }
      for (const leaf of parent.leaves) {
        entry.leaves.push(leaf)
        tally[leaf.level] += 1
      }
      byPaper.set(parent.paper, entry)
    }

    return {
      papers: [...byPaper.entries()].map(([paper, v]) => ({ paper, ...v })),
      counts: tally,
      total: Object.values(tally).reduce((a, b) => a + b, 0),
    }
  }, [parentMasteries])

  if (total === 0) return null

  const present = LEVEL_ORDER.filter((l) => counts[l] > 0)

  return (
    <div className="ms-mastery-heatmap">
      {/* The distribution bar is the legend: it names every level with its count
          AND shows the balance, so one element does both jobs. */}
      <div
        className="ms-mh-dist"
        role="img"
        aria-label={`Across ${total} topics: ${present
          .map((l) => `${counts[l]} ${LEVEL_LABEL[l].toLowerCase()}`)
          .join(', ')}.`}
      >
        {present.map((level) => (
          <span
            key={level}
            className="ms-mh-dist__seg"
            data-level={LEVEL_TOKEN[level]}
            style={{ flexGrow: counts[level] }}
            aria-hidden="true"
          />
        ))}
      </div>
      <ul className="ms-mh-legend" aria-hidden="true">
        {present.map((level) => (
          <li key={level}>
            <span className="ms-mh-legend__dot" data-level={LEVEL_TOKEN[level]} />
            {counts[level]} {LEVEL_LABEL[level].toLowerCase()}
          </li>
        ))}
      </ul>

      <div className="ms-mh-grid">
        {papers.map(({ paper, paperName, leaves }) => (
          <div key={paper} className="ms-mh-row">
            <p className="ms-mh-row__label" title={paperName}>
              {paper}
            </p>
            <div className="ms-mh-cells">
              {leaves.map((leaf) => {
                const attempted = leaf.attemptsCount > 0
                return (
                  <button
                    key={leaf.code}
                    type="button"
                    className="ms-mh-cell"
                    data-level={LEVEL_TOKEN[leaf.level]}
                    data-attempted={attempted ? 'yes' : 'no'}
                    onClick={() => onSelectLeaf(leaf)}
                    title={`${leaf.name} — ${LEVEL_LABEL[leaf.level]}${
                      attempted ? ` · ${Math.round(leaf.percentage)}%` : ''
                    }`}
                  >
                    {/* Score doubles as the non-colour channel for attempted
                        cells; unattempted cells are visually empty and dashed. */}
                    <span aria-hidden="true">
                      {attempted ? Math.round(leaf.percentage) : ''}
                    </span>
                    <span className="sr-only">
                      {leaf.name} — {LEVEL_LABEL[leaf.level]}
                      {attempted
                        ? `, ${Math.round(leaf.percentage)}% across ${leaf.attemptsCount} attempt${
                            leaf.attemptsCount === 1 ? '' : 's'
                          }`
                        : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
