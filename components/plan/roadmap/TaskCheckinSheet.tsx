'use client'

import { useEffect, useId, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { CHECKIN_FEEL_EFFECT, CHECKIN_FEEL_LABEL, type CheckinFeel } from '@/lib/plan/roadmap-types'
import type { RoadmapTask } from '@/lib/plan/roadmap-view'

const ALL_FEELS: readonly CheckinFeel[] = ['too_easy', 'about_right', 'too_hard', 'took_longer', 'was_busy', 'need_help']

export type RatingKind = 'plan_felt_realistic' | 'understood_why'

type Props = {
  task: RoadmapTask | null
  /** The feelings the reducer would act on for this task (availableFeels); every one shown keeps its promise. */
  feels?: readonly CheckinFeel[]
  open: boolean
  busy: boolean
  /** "Saved on this device — will sync" while offline. */
  syncNote?: string | null
  /** After the third completed task ever: two one-tap questions, once. */
  askRatings: boolean
  onClose: () => void
  onFeel: (task: RoadmapTask, feel: CheckinFeel, actualMinutes?: number) => void
  onRating: (kind: RatingKind, value: boolean) => void
}

/**
 * "How did that go?" after a task. Optional, never required: the sheet can
 * be dismissed and nothing is sent. Each feeling shows what it will change
 * (CHECKIN_FEEL_EFFECT) before the tap, because a check-in that silently
 * rewrites tomorrow is a trap. "Took longer" asks for the real minutes so
 * tasks like it get sized honestly; "I need help" opens the way to the
 * worked example and the review queue and stays open until the student
 * closes it.
 */
export function TaskCheckinSheet({ task, feels = ALL_FEELS, open, busy, syncNote = null, askRatings, onClose, onFeel, onRating }: Props) {
  const titleId = useId()
  const [chosen, setChosen] = useState<CheckinFeel | null>(null)
  const [actual, setActual] = useState('')
  const [sent, setSent] = useState(false)
  const [rated, setRated] = useState<Partial<Record<RatingKind, boolean>>>({})

  // A fresh sheet for each task.
  useEffect(() => {
    if (!open) return
    setChosen(null)
    setActual('')
    setSent(false)
    setRated({})
  }, [open, task?.id])

  if (!task) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const send = (feel: CheckinFeel, minutes?: number) => {
    onFeel(task, feel, minutes)
    setSent(true)
    if (feel !== 'need_help' && !askRatings) onClose()
  }

  const pick = (feel: CheckinFeel) => {
    setChosen(feel)
    if (feel === 'took_longer') return
    send(feel)
  }

  const submitMinutes = () => {
    const n = Math.round(Number(actual))
    send('took_longer', Number.isFinite(n) && n > 0 ? Math.min(600, n) : undefined)
  }

  const rate = (kind: RatingKind, value: boolean) => {
    setRated((r) => ({ ...r, [kind]: value }))
    onRating(kind, value)
  }

  return (
    <Sheet open={open} onClose={onClose} labelledById={titleId}>
      <div className="ms-rm-sheet">
        <p className="ec-eyebrow mb-1">Done</p>
        <h2 id={titleId} className="ms-rm-sheet__title">
          How did that go?
        </h2>
        <p className="ms-rm-sheet__sub">{task.objective}</p>

        {!sent ? (
          <ul className="ms-rm-feels" aria-label="How did that go">
            {feels.map((feel) => (
              <li key={feel}>
                <button
                  type="button"
                  className={`ms-rm-feel${chosen === feel ? ' is-on' : ''}`}
                  aria-pressed={chosen === feel}
                  disabled={busy}
                  onClick={() => pick(feel)}
                >
                  <span className="ms-rm-feel__label">{CHECKIN_FEEL_LABEL[feel]}</span>
                  <span className="ms-rm-feel__effect">{CHECKIN_FEEL_EFFECT[feel]}</span>
                </button>
                {feel === 'took_longer' && chosen === 'took_longer' ? (
                  <div className="ms-rm-feel__input">
                    <label htmlFor={`${titleId}-actual`} className="text-caption">
                      About how many minutes did it take?
                    </label>
                    <div className="ms-rm-inline-form">
                      <input
                        id={`${titleId}-actual`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={600}
                        className="ec-input ms-rm-input"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            submitMinutes()
                          }
                        }}
                      />
                      <button type="button" className="ms-rm-btn" disabled={busy} onClick={submitMinutes}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-rm-sheet__ok" role="status">
            {chosen ? CHECKIN_FEEL_EFFECT[chosen] : 'Noted.'}
          </p>
        )}

        {chosen === 'need_help' ? (
          <div className="ms-rm-actions" aria-label="Where to get help">
            {task.helpHref ? (
              <LoadingLink href={task.helpHref} variant="button" loadingText="Opening…" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary">
                {task.helpHref.includes('#worked-examples') ? 'Open the worked example' : 'Open the lesson'}
              </LoadingLink>
            ) : task.href ? (
              <LoadingLink href={task.href} variant="button" loadingText="Opening…" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary">
                {task.href.includes('/courses/') ? 'Open the lesson' : 'Open the task'}
              </LoadingLink>
            ) : null}
            <LoadingLink href="/dashboard/review" variant="button" loadingText="Opening…" className="ms-rm-btn">
              Your review queue
            </LoadingLink>
          </div>
        ) : null}

        {askRatings ? (
          <div className="ms-rm-ratings" aria-label="Two quick questions">
            <RatingRow
              question="Did today's plan feel realistic?"
              value={rated.plan_felt_realistic}
              onPick={(v) => rate('plan_felt_realistic', v)}
            />
            <RatingRow
              question="Did you understand why this mattered?"
              value={rated.understood_why}
              onPick={(v) => rate('understood_why', v)}
            />
          </div>
        ) : null}

        {syncNote ? (
          <p className="ms-rm-sheet__sync" role="status">
            {syncNote}
          </p>
        ) : null}

        <div className="ms-rm-actions ms-rm-actions--end">
          <button type="button" className="ms-rm-btn ms-rm-btn--quiet" onClick={onClose}>
            {sent ? 'Close' : 'Not now'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function RatingRow({ question, value, onPick }: { question: string; value: boolean | undefined; onPick: (v: boolean) => void }) {
  return (
    <div className="ms-rm-rating">
      <span className="ms-rm-rating__q">{question}</span>
      <span className="ms-rm-rating__opts" role="group" aria-label={question}>
        <button type="button" className={`ms-rm-btn ms-rm-btn--quiet${value === true ? ' is-on' : ''}`} aria-pressed={value === true} onClick={() => onPick(true)}>
          Yes
        </button>
        <button type="button" className={`ms-rm-btn ms-rm-btn--quiet${value === false ? ' is-on' : ''}`} aria-pressed={value === false} onClick={() => onPick(false)}>
          No
        </button>
      </span>
    </div>
  )
}
