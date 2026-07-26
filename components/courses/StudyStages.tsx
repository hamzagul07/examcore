'use client'

import type { StageId } from '@/lib/courses/lesson-stages'
import { STAGE_LABEL } from '@/lib/courses/study-mode'

/**
 * The stage rail for study mode: five steps, one at a time.
 *
 * The point of study mode is that a lesson stops looking like sixteen headings
 * you have to triage and starts looking like five things you do in order. So
 * this shows where you are in that order, and — more usefully — which stages you
 * have already finished, taken from the same per-section progress the document
 * mode uses. Nothing here is a second source of truth.
 */

const STAGE_SUB: Record<StageId, string> = {
  orient: 'what this is',
  see: 'picture it',
  read: 'the detail',
  check: 'test yourself',
  prove: 'do it for real',
}

export function StudyStages({
  stages,
  active,
  doneStages,
  onSelect,
}: {
  stages: readonly StageId[]
  active: StageId
  /** Stages whose every section has been worked through. */
  doneStages: ReadonlySet<StageId>
  onSelect: (stage: StageId) => void
}) {
  if (stages.length < 2) return null
  const i = stages.indexOf(active)

  return (
    <nav className="study-rail" aria-label="Study stages">
      <ol className="study-rail-list">
        {stages.map((s, n) => {
          const isActive = s === active
          const isDone = doneStages.has(s)
          return (
            <li key={s} className="study-rail-item">
              <button
                type="button"
                className={`study-step${isActive ? ' on' : ''}${isDone ? ' done' : ''}`}
                onClick={() => onSelect(s)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="study-step-dot mono" aria-hidden>
                  {isDone && !isActive ? '✓' : n + 1}
                </span>
                <span className="study-step-text">
                  <span className="study-step-label">{STAGE_LABEL[s]}</span>
                  <span className="study-step-sub">{STAGE_SUB[s]}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="study-rail-count mono" aria-live="polite">
        STEP {i + 1} / {stages.length}
      </p>
    </nav>
  )
}

/** Bottom-of-stage control. Separate so it can sit after the content. */
export function StudyStageFooter({
  stages,
  active,
  onStep,
}: {
  stages: readonly StageId[]
  active: StageId
  onStep: (delta: number) => void
}) {
  if (stages.length < 2) return null
  const i = stages.indexOf(active)
  const prev = i > 0 ? stages[i - 1] : null
  const next = i < stages.length - 1 ? stages[i + 1] : null
  if (!prev && !next) return null

  return (
    <div className="study-foot">
      {prev ? (
        <button type="button" className="study-foot-btn" onClick={() => onStep(-1)}>
          <span className="study-foot-dir mono">BACK</span>
          <span className="study-foot-name">{STAGE_LABEL[prev]}</span>
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button type="button" className="study-foot-btn next" onClick={() => onStep(1)}>
          <span className="study-foot-dir mono">NEXT</span>
          <span className="study-foot-name">{STAGE_LABEL[next]} →</span>
        </button>
      ) : (
        <span className="study-foot-end">
          That is the whole lesson. Keep going below.
        </span>
      )}
    </div>
  )
}
