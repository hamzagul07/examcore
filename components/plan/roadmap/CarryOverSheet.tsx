'use client'

import { useId } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import type { CarryOption } from '@/lib/plan/task-actions'
import type { RoadmapTask } from '@/lib/plan/roadmap-view'
import { carryFitLine, dayLabel } from '@/components/plan/roadmap/labels'

type Props = {
  /** One task, or every not-done task of a past day. */
  tasks: RoadmapTask[]
  options: CarryOption[]
  open: boolean
  busy: boolean
  todayIso: string
  onClose: () => void
  onPick: (date: string) => void
}

export const CARRY_NONE_LINE = 'No study day before the paper can take this one.'

/**
 * "Carry over to…": the next few days the task can move to, each with
 * what moving it there means — at full length in free time, shortened to
 * the room the day has, or running past the day's last window. The
 * student picks with the facts in front of them; nothing is chosen for
 * them and nothing is hidden about the cost.
 */
export function CarryOverSheet({ tasks, options, open, busy, todayIso, onClose, onPick }: Props) {
  const titleId = useId()
  const task = tasks[0]
  if (!task) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const many = tasks.length > 1
  const minutes = tasks.reduce((n, t) => n + t.minutes, 0)
  return (
    <Sheet open={open} onClose={onClose} labelledById={titleId}>
      <div className="ms-rm-sheet">
        <p className="ec-eyebrow mb-1">Carry over</p>
        <h2 id={titleId} className="ms-rm-sheet__title">
          {many ? `${tasks.length} tasks, about ${minutes} min` : task.objective}
        </h2>
        <p className="ms-rm-sheet__sub">
          {many
            ? 'Pick the day they move to. Each one takes the room it finds there; anything that does not fit runs past that day\'s last window, and the day they were on keeps a note that they moved.'
            : 'Pick the day it moves to. The day it was on keeps a note that it moved.'}
        </p>
        {options.length > 0 ? (
          <ul className="ms-rm-carry" aria-label="Days it can move to">
            {options.map((o) => (
              <li key={o.date}>
                <button type="button" className={`ms-rm-carry__day is-${o.fit}`} disabled={busy} onClick={() => onPick(o.date)}>
                  <span className="ms-rm-carry__when">{dayLabel(o.date, todayIso)}</span>
                  <span className="ms-rm-carry__fit">{many ? `${tasks.length} tasks · about ${o.inHand} min in hand there` : carryFitLine(o)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-plan-note">{CARRY_NONE_LINE}</p>
        )}
        <div className="ms-rm-actions">
          <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={onClose}>
            Leave it
          </button>
        </div>
      </div>
    </Sheet>
  )
}
