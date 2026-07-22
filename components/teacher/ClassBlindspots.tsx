'use client'

import { useState } from 'react'
import { AlertTriangle, Info, Zap } from 'lucide-react'
import { InterventionGenerator } from './InterventionGenerator'
import {
  actionable,
  rankBlindspots,
  type BlindspotInput,
} from '@/lib/teacher/blindspots'

/**
 * Which topics is this class weak on — all of them, at once.
 *
 * This replaces a view that showed the single worst topic as one bar and
 * reduced everything else to chips, under the name "Blindspot Radar". A teacher
 * scanning a class needs to compare topics against each other, and a radar is
 * the wrong instrument for that: the area distorts magnitude and adjacent
 * spokes are hard to read against one another. Comparing magnitude across named
 * categories is a BAR CHART, horizontal because topic names are long.
 *
 * Two facts per row, deliberately not merged: how weak the class is, and how
 * many of them we've actually seen. A topic averaging 38% across 4 of 28
 * students is a different fact from 38% across 24, and a teacher who can't tell
 * them apart will reteach on the strength of four scripts. Thin rows are marked
 * in words and in form, never colour alone.
 *
 * Level colours are the same reserved status tokens the student mastery view
 * uses, so "critical" means one thing across the product.
 */

const LEVEL_TOKEN = {
  critical: 'critical',
  proficient: 'warning',
  secure: 'success',
} as const

const LEVEL_LABEL = {
  critical: 'Critical',
  proficient: 'Shaky',
  secure: 'Secure',
} as const

export function ClassBlindspots({
  classroomId,
  blindspots,
}: {
  classroomId: string
  blindspots: BlindspotInput[]
}) {
  const [showIntervention, setShowIntervention] = useState(false)
  const ranked = rankBlindspots(blindspots)
  const targets = actionable(ranked)
  const worst = ranked[0]

  if (!worst) {
    return (
      <div className="ec-card p-8">
        <h2 className="mb-2 text-xl font-bold text-[var(--ec-text-primary)]">
          Class blindspots
        </h2>
        <p className="text-[var(--ec-text-secondary)]">
          Not enough data yet. Topics appear once a few students have been
          marked on them.
        </p>
      </div>
    )
  }

  return (
    <section className="ms-blindspots ec-card p-6 sm:p-8">
      <div className="ms-blindspots__head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 ec-score-low" aria-hidden="true" />
            <span className="ec-label-tech ec-score-low">Class blindspots</span>
          </div>
          <h2 className="ms-blindspots__title">
            Weakest first — {worst.name} at {Math.round(worst.avgMastery)}%
          </h2>
          <p className="ms-blindspots__sub">
            Class average per topic, across the students who have been marked on
            it.
          </p>
        </div>
      </div>

      <ol
        className="ms-blindspots__list"
        aria-label={`${ranked.length} topics ranked weakest first`}
      >
        {ranked.map((t) => (
          <li
            key={t.code}
            className="ms-bs-row"
            data-level={LEVEL_TOKEN[t.level]}
            data-thin={t.thinEvidence ? 'yes' : 'no'}
          >
            <div className="ms-bs-row__head">
              <span className="ms-bs-row__name" title={`${t.code} · ${t.paper}`}>
                {t.name}
              </span>
              <span className="ms-bs-row__pct">{Math.round(t.avgMastery)}%</span>
            </div>

            <div className="ms-bs-row__track">
              <span
                className="ms-bs-row__fill"
                style={{ width: `${Math.max(1.5, Math.min(100, t.avgMastery))}%` }}
              />
            </div>

            <p className="ms-bs-row__meta">
              <span className="ms-bs-row__level">{LEVEL_LABEL[t.level]}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t.studentsAttempted} of {t.totalStudents} students
              </span>
              {t.thinEvidence && (
                <span className="ms-bs-row__thin">
                  <Info className="h-3 w-3" aria-hidden="true" />
                  too few to act on yet
                </span>
              )}
            </p>
          </li>
        ))}
      </ol>

      <div className="ms-blindspots__foot">
        <button
          type="button"
          onClick={() => setShowIntervention(true)}
          disabled={targets.length === 0}
          className="ec-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2"
        >
          <Zap className="h-5 w-5" aria-hidden="true" />
          Generate targeted intervention
        </button>
        <p className="ms-blindspots__foot-note">
          {targets.length > 0
            ? `Targets the ${Math.min(3, targets.length)} weakest topics with enough evidence to trust.`
            : 'Needs at least one weak topic with enough students marked on it.'}
        </p>
      </div>

      {showIntervention && (
        <InterventionGenerator
          classroomId={classroomId}
          targetCodes={targets.slice(0, 3).map((b) => b.code)}
          onClose={() => setShowIntervention(false)}
        />
      )}
    </section>
  )
}
