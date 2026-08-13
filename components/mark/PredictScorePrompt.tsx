'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { LeaveNotice } from '@/components/mark/LeaveNotice'

/**
 * "What do you think you got?" — asked while the mark is still running.
 *
 * Two jobs, and the second is the one that matters. It gives the wait something
 * to do, which is worth a lot when marking honestly costs minutes. But it also
 * makes the reveal land differently: a student who has committed to a number
 * reads the breakdown to find out why they were wrong, where a student handed a
 * score reads it to find out whether to argue. The gap between predicted and
 * awarded is also the only measure we have of whether someone can read their
 * own answer — which is the skill that actually walks into the exam hall.
 *
 * Must be answered before the result arrives or not at all; a "prediction"
 * collected after the score is just agreement.
 */
export type PredictScorePromptProps = {
  /** Null until the stream reports it — the prompt stays hidden until then. */
  markRunId: string | null
  /** The denominator, when the student told us one. */
  totalMarks: number | null
  /** Whether the caller is already showing the permission-to-leave notice, so
   * the prompt can share its card instead of the two stacking. */
  showLeaveNotice: boolean
  onPredicted?: (marks: number) => void
  /**
   * Dismissal is reported up rather than kept here, so exactly one place knows
   * whether this prompt is on screen. When the prompt owned that state, the
   * caller could not tell that Skip had hidden it, and the leave notice —
   * which the prompt was carrying — vanished with it. Skip is precisely the
   * student who most needs telling they can walk away.
   */
  onDismiss?: () => void
}

/** Buttons up to this many marks; above it, typing a number is faster. */
const MAX_BUTTONS = 12

export function PredictScorePrompt({
  markRunId,
  totalMarks,
  showLeaveNotice,
  onPredicted,
  onDismiss,
}: PredictScorePromptProps) {
  const [saved, setSaved] = useState<number | null>(null)
  const [typed, setTyped] = useState('')

  const submit = (marks: number) => {
    if (!markRunId || saved != null) return
    setSaved(marks)
    onPredicted?.(marks)
    // Fire-and-forget: a prediction that fails to save costs a sentence on the
    // results page, and must never interrupt a mark that is still running.
    void fetch('/api/mark/prediction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_run_id: markRunId, predicted_marks: marks }),
    }).catch(() => {})
  }

  // No run id means telemetry could not open a row. The prediction has nowhere
  // to be filed, so the prompt stands down — the caller keeps showing the leave
  // notice on its own.
  if (!markRunId) return null

  const useButtons =
    typeof totalMarks === 'number' && totalMarks > 0 && totalMarks <= MAX_BUTTONS

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-5"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {saved == null ? (
          <motion.div key="ask" exit={{ opacity: 0 }}>
            <h3 className="text-base font-semibold text-[var(--ec-text-primary)]">
              While that runs — what do you think you got?
            </h3>
            <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
              Commit to a number before you see the examiner&apos;s. Knowing how far
              off you are is worth more than the mark itself.
            </p>

            {useButtons ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: totalMarks! + 1 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => submit(n)}
                    className="min-w-[2.5rem] rounded-md border border-[var(--ec-border)] px-3 py-2 text-sm font-medium text-[var(--ec-text-primary)] transition-colors hover:border-[var(--ec-brand)] hover:text-[var(--ec-brand)]"
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="mt-4 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = Number(typed.trim())
                  if (Number.isFinite(n) && n >= 0 && n <= 200) submit(Math.round(n))
                }}
              >
                <label htmlFor="predicted-marks" className="sr-only">
                  Marks you think you scored
                </label>
                <input
                  id="predicted-marks"
                  inputMode="numeric"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={totalMarks ? `0–${totalMarks}` : 'Marks'}
                  className="w-24 rounded-md border border-[var(--ec-border)] bg-[var(--ec-canvas)] px-3 py-2 text-sm text-[var(--ec-text-primary)]"
                />
                <button
                  type="submit"
                  disabled={!typed.trim()}
                  className="rounded-md border border-[var(--ec-border)] px-3 py-2 text-sm font-medium text-[var(--ec-text-primary)] disabled:opacity-40"
                >
                  Lock it in
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => onDismiss?.()}
              className="mt-3 text-xs text-[var(--ec-text-secondary)] underline underline-offset-2"
            >
              Skip
            </button>
          </motion.div>
        ) : (
          <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-base font-semibold text-[var(--ec-text-primary)]">
              Locked in: {saved}
              {totalMarks ? `/${totalMarks}` : ''}
            </h3>
            <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
              You&apos;ll see how close you were the moment the marking lands.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {showLeaveNotice && (
        <div className="mt-4 border-t border-[var(--ec-border)] pt-4">
          <LeaveNotice />
        </div>
      )}
    </motion.section>
  )
}
