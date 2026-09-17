'use client'

import { useEffect, useId, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import type { ReplanChange, ReplanDiff } from '@/lib/plan/roadmap-types'

export type ReplanSheetMode = 'confirm' | 'diff'

type Props = {
  open: boolean
  mode: ReplanSheetMode
  diff: ReplanDiff | null
  busy: boolean
  /** Whether an undo point exists for this diff. */
  canUndo: boolean
  syncNote?: string | null
  onClose: () => void
  onConfirm: (minutesLeft?: number) => void
  onUndo: () => void
}

const CHANGED: ReadonlySet<ReplanChange['kind']> = new Set(['moved', 'shortened', 'added', 'swapped', 'inserted', 'resized'])

/**
 * Two faces. 'confirm' asks before rebuilding the rest of today, with an
 * optional "minutes left" so the student can say what the clock cannot
 * know. 'diff' shows what a replan, a rollover or a check-in did — what
 * changed, why, and what was let go — with one Undo. The summary line is a
 * live region so a screen reader hears the outcome without hunting for it.
 */
export function ReplanSheet({ open, mode, diff, busy, canUndo, syncNote = null, onClose, onConfirm, onUndo }: Props) {
  const titleId = useId()
  const [minutesLeft, setMinutesLeft] = useState('')

  useEffect(() => {
    if (open) setMinutesLeft('')
  }, [open])

  const changed = diff?.changes.filter((c) => CHANGED.has(c.kind)) ?? []
  const dropped = diff?.changes.filter((c) => c.kind === 'dropped') ?? []
  const kept = diff?.changes.filter((c) => c.kind === 'kept') ?? []

  return (
    <Sheet open={open} onClose={onClose} labelledById={titleId}>
      <div className="ms-rm-sheet">
        {mode === 'confirm' ? (
          <>
            <p className="ec-eyebrow mb-1">Adjust today</p>
            <h2 id={titleId} className="ms-rm-sheet__title">
              Replan the rest of today around the time you have left?
            </h2>
            <p className="ms-rm-sheet__sub">
              Done, pinned and started tasks stay where they are. Anything that no longer fits goes back to the pool, not onto tomorrow.
            </p>
            <div className="ms-rm-feel__input">
              <label htmlFor={`${titleId}-left`} className="text-caption">
                Minutes you have left (optional)
              </label>
              <input
                id={`${titleId}-left`}
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                className="ec-input ms-rm-input"
                value={minutesLeft}
                onChange={(e) => setMinutesLeft(e.target.value)}
                placeholder="Leave blank to use the clock"
              />
            </div>
            <div className="ms-rm-actions">
              <button
                type="button"
                className="ec-btn-primary ms-rm-btn ms-rm-btn--primary"
                disabled={busy}
                onClick={() => {
                  const n = Math.round(Number(minutesLeft))
                  onConfirm(minutesLeft.trim() !== '' && Number.isFinite(n) && n >= 0 ? Math.min(600, n) : undefined)
                }}
              >
                {busy ? 'Replanning…' : 'Replan today'}
              </button>
              <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={onClose}>
                Keep it as it is
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="ec-eyebrow mb-1">What changed</p>
            <h2 id={titleId} className="ms-rm-sheet__title">
              Today was adjusted
            </h2>
            <p className="ms-rm-sheet__sub" role="status" aria-live="polite">
              {diff?.summary ?? 'Plans change. We protected the essentials and rebuilt today.'}
            </p>

            {changed.length > 0 ? (
              <DiffGroup heading="What changed" items={changed} />
            ) : null}
            {dropped.length > 0 ? (
              <DiffGroup heading="What was let go" items={dropped} quiet />
            ) : null}
            {kept.length > 0 ? (
              <p className="ms-rm-diff__kept">
                {kept.length === 1 ? '1 task was protected.' : `${kept.length} tasks were protected.`}
              </p>
            ) : null}
            {changed.length === 0 && dropped.length === 0 ? (
              <p className="ms-rm-diff__kept">Nothing needed to move.</p>
            ) : null}

            {syncNote ? (
              <p className="ms-rm-sheet__sync" role="status">
                {syncNote}
              </p>
            ) : null}

            <div className="ms-rm-actions">
              {canUndo ? (
                <button type="button" className="ms-rm-btn" disabled={busy} onClick={onUndo}>
                  {busy ? 'Undoing…' : 'Undo'}
                </button>
              ) : null}
              <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={onClose}>
                Fine by me
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

function DiffGroup({ heading, items, quiet = false }: { heading: string; items: ReplanChange[]; quiet?: boolean }) {
  return (
    <section className={`ms-rm-diff${quiet ? ' ms-rm-diff--quiet' : ''}`} aria-label={heading}>
      <h3 className="ms-rm-diff__head">{heading}</h3>
      <ul className="ms-rm-diff__list">
        {items.map((c, i) => (
          <li key={`${c.taskId}-${i}`} className={`ms-rm-diff__item ms-rm-diff__item--${c.kind}`}>
            <span className="ms-rm-diff__kind">{KIND_LABEL[c.kind]}</span>
            <span className="ms-rm-diff__label">{c.label}</span>
            {c.detail ? <span className="ms-rm-diff__detail">{c.detail}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

const KIND_LABEL: Record<ReplanChange['kind'], string> = {
  moved: 'Moved',
  shortened: 'Shortened',
  dropped: 'Let go',
  added: 'Added',
  swapped: 'Swapped',
  inserted: 'Added',
  resized: 'Resized',
  kept: 'Kept',
}
