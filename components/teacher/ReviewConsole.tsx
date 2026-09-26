'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { OverrideConsole, type OverrideFieldError } from '@/components/teacher/OverrideConsole'
import {
  DECISION_LABEL,
  DECISION_STAMP,
  MAX_REASONING_NOTE_CHARS,
  buildDecisionPayload,
  decisionFieldTarget,
  describeReviewFailure,
  markWeights,
  suggestedTotal,
} from '@/lib/teacher/override-validate'
import type { ReviewMarkView } from '@/lib/teacher/reviews-query'
import type { ReviewDecision } from '@/lib/teacher/types'

export type ReviewConsoleProps = {
  attemptId: string
  /** "Amira" — used in the console's copy. */
  studentFirstName: string
  marksEarned: number | null
  totalMarks: number | null
  /** The marker's own total, when known (differs from marksEarned after an override). */
  aiMarksEarned: number | null
  marking: 'per_mark' | 'total_only'
  totalOnlyBasis: 'band_result' | 'criteria_results' | 'mcq_breakdown' | 'none' | null
  marks: ReviewMarkView[]
  judgement: Array<{ label: string; value: string }>
  /** The teacher's own latest decision on this script. */
  latestDecision: { decision: ReviewDecision; created_at: string } | null
  nav: {
    prevHref: string | null
    nextHref: string | null
    inboxHref: string
    /** 0-based position in the filter, when the script is in it. */
    index: number | null
    total: number
  }
}

const STAMPS: Array<{ decision: ReviewDecision; modifier: string; label: string }> = [
  { decision: 'confirm', modifier: 'confirm', label: 'Confirm' },
  { decision: 'override', modifier: 'override', label: 'Override' },
  { decision: 'flag', modifier: 'flag', label: 'Flag' },
]

const AUTO_NEXT_KEY = 'ms-review-auto-next'
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function readAutoNext(): boolean {
  try {
    return window.localStorage.getItem(AUTO_NEXT_KEY) !== '0'
  } catch {
    return true
  }
}

function writeAutoNext(on: boolean): void {
  try {
    window.localStorage.setItem(AUTO_NEXT_KEY, on ? '1' : '0')
  } catch {
    // Private mode or blocked storage: the preference lasts for this page only.
  }
}

function shortDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATE_FORMAT.format(t) : 'an earlier visit'
}

function markText(earned: number | null, total: number | null): string {
  if (earned === null) return '—'
  return total === null ? String(earned) : `${earned}/${total}`
}

/**
 * The review console (`.ms-review-console`, spec §4): three stamps — OK
 * (the AI mark stands), OV (change it: per-mark toggles, the total, a note,
 * whether the student is told), FLG (come back to it) — then save.
 *
 * Errors: any refused or failed save shows in a FormErrorAlert (focused and
 * announced) with the server's own reason, and a 400's `field` marks the
 * control it names. Nothing is reported as saved unless the response was OK.
 *
 * After a save the chosen stamp lands (ec-stamp-in) and, unless the teacher
 * turned it off, the next script in the same filter opens; otherwise the
 * page refreshes in place so the history shows the decision.
 */
export function ReviewConsole({
  attemptId,
  studentFirstName,
  marksEarned,
  totalMarks,
  aiMarksEarned,
  marking,
  totalOnlyBasis,
  marks,
  judgement,
  latestDecision,
  nav,
}: ReviewConsoleProps) {
  const router = useRouter()
  const id = useId()
  const [decision, setDecision] = useState<ReviewDecision | null>(null)
  const [earned, setEarned] = useState<boolean[]>(() => marks.map((m) => m.earned))
  const [total, setTotal] = useState(marksEarned === null ? '' : String(marksEarned))
  const [totalTouched, setTotalTouched] = useState(false)
  const [note, setNote] = useState('')
  const [studentVisible, setStudentVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<ReviewDecision | null>(null)
  const [error, setError] = useState<{ message: string; part: string; field: OverrideFieldError | null } | null>(null)
  const [status, setStatus] = useState('')
  const [autoNext, setAutoNext] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextLink = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    setAutoNext(readAutoNext())
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const weights = useMemo(() => markWeights(marks, marksEarned), [marks, marksEarned])
  const suggested = suggestedTotal(earned, weights, totalMarks)

  function choose(next: ReviewDecision) {
    setDecision(next)
    setSaved(null)
    setError(null)
    setStatus('')
  }

  function toggle(index: number) {
    const nextEarned = earned.map((e, i) => (i === index ? !e : e))
    setEarned(nextEarned)
    setError(null)
    // The total follows the ticks until the teacher types one of their own.
    const sum = suggestedTotal(nextEarned, weights, totalMarks)
    if (!totalTouched && sum !== null) setTotal(String(sum))
  }

  function changeTotal(value: string) {
    setTotal(value)
    setTotalTouched(true)
    setError(null)
  }

  function applySuggested() {
    if (suggested === null) return
    setTotal(String(suggested))
    setTotalTouched(false)
    setError(null)
  }

  /** Checks the server would make anyway, answered without a round trip. */
  function localProblem(): { message: string; field: OverrideFieldError | null; part: string } | null {
    if (decision !== 'override') return null
    const value = total.trim() === '' ? NaN : Number(total)
    if (!Number.isInteger(value) || value < 0 || (totalMarks !== null && value > totalMarks)) {
      const message =
        totalMarks === null
          ? 'Enter the new total as a whole number of marks.'
          : `Enter the new total as a whole number from 0 to ${totalMarks}.`
      return { message: `Not saved — ${message.charAt(0).toLowerCase()}${message.slice(1)}`, part: 'total', field: { part: 'total', markIndex: null, message } }
    }
    const marksChanged = marks.some((m, i) => earned[i] !== m.earned)
    if (!marksChanged && value === marksEarned) {
      return {
        message: 'Nothing has changed yet. Tick or untick a mark, or change the total — or choose OK to confirm the mark as it is.',
        part: 'decision',
        field: null,
      }
    }
    return null
  }

  async function save() {
    if (!decision || saving) return
    const problem = localProblem()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    setStatus('Saving…')
    try {
      const payload = buildDecisionPayload({
        decision,
        marks: marking === 'per_mark' ? marks.map((m, i) => ({ mark_id: m.mark_id, earned: earned[i] === true })) : null,
        total: decision === 'override' ? Number(total) : null,
        note,
        studentVisible,
      })
      const res = await fetch(`/api/teacher/attempt/${attemptId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
      if (!res.ok) {
        const target = decisionFieldTarget(data.field)
        const message = describeReviewFailure(res.status, data)
        setStatus('')
        setError({
          message,
          part: target.part,
          field:
            target.part === 'total' || target.part === 'marks'
              ? { part: target.part, markIndex: target.markIndex, message: data.error ?? message }
              : null,
        })
        return
      }
      setSaved(decision)
      const goNext = autoNext && nav.nextHref
      setStatus(
        `${DECISION_LABEL[decision]} — saved.${goNext ? ' Opening the next script…' : nav.nextHref ? ' Next script is ready below.' : ''}`
      )
      if (goNext) {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        timer.current = setTimeout(() => router.push(nav.nextHref as string), reduced ? 150 : 700)
      } else {
        router.refresh()
        nextLink.current?.focus()
      }
    } catch {
      setStatus('')
      setError({ message: 'Not saved — could not reach the server. Check your connection and try again.', part: 'other', field: null })
    } finally {
      setSaving(false)
    }
  }

  const noteId = `${id}-note`
  const noteLabel =
    decision === 'flag'
      ? 'Note to yourself (optional)'
      : studentVisible
        ? `Note to ${studentFirstName} (optional)`
        : 'Note (only you will see it)'
  const saveLabel =
    decision === 'confirm'
      ? `Confirm ${markText(marksEarned, totalMarks)}`
      : decision === 'override'
        ? 'Save new mark'
        : decision === 'flag'
          ? 'Flag for later'
          : 'Choose OK, OV or FLG'
  const position = nav.index !== null && nav.total > 0 ? `${nav.index + 1} of ${nav.total}` : nav.total > 0 ? `${nav.total} in this list` : null

  return (
    <aside className="ms-review-console" aria-labelledby={`${id}-title`}>
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="ms-review-console__title">
          Your decision
        </h2>
        <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
          Mark now <strong className="font-mono text-[var(--ec-text-primary)]">{markText(marksEarned, totalMarks)}</strong>
          {aiMarksEarned !== null && aiMarksEarned !== marksEarned ? (
            <> · AI gave <span className="font-mono">{markText(aiMarksEarned, totalMarks)}</span></>
          ) : null}
        </p>
        {latestDecision ? (
          <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
            Last time you{' '}
            {latestDecision.decision === 'confirm' ? 'confirmed it' : latestDecision.decision === 'override' ? 're-marked it' : 'flagged it'} on{' '}
            {shortDate(latestDecision.created_at)}.
          </p>
        ) : null}
      </div>

      <div className="ms-review-console__stamps" role="group" aria-label="Decision">
        {STAMPS.map((s) => {
          const pressed = decision === s.decision
          return (
            <button
              key={s.decision}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(s.decision)}
              disabled={saving}
              className={`ms-review-console__stamp ms-review-console__stamp--${s.modifier}${saved === s.decision ? ' is-saved' : ''}`}
            >
              <span aria-hidden>{DECISION_STAMP[s.decision]}</span>
              <small>{s.label}</small>
            </button>
          )
        })}
      </div>

      {decision === 'confirm' ? (
        <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
          The mark of {markText(marksEarned, totalMarks)} stands as it is. Nothing on {studentFirstName}&apos;s script
          changes.
        </p>
      ) : null}
      {decision === 'flag' ? (
        <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
          Keeps the mark as it is and moves this script up your list. Only you see a flag and its note.
        </p>
      ) : null}
      {decision === 'override' ? (
        <OverrideConsole
          marking={marking}
          totalOnlyBasis={totalOnlyBasis}
          marks={marks}
          earned={earned}
          onToggle={toggle}
          total={total}
          onTotalChange={changeTotal}
          suggested={suggested}
          onUseSuggested={applySuggested}
          totalMarks={totalMarks}
          judgement={judgement}
          error={error?.field ?? null}
          idPrefix={id}
        />
      ) : null}

      {decision ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="text-sm font-semibold text-[var(--ec-text-primary)]">
            {noteLabel}
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              if (error?.part === 'note') setError(null)
            }}
            rows={3}
            maxLength={MAX_REASONING_NOTE_CHARS}
            className="ec-input w-full resize-y"
            aria-invalid={error?.part === 'note' || undefined}
            aria-describedby={`${noteId}-count`}
            placeholder={
              decision === 'flag' ? 'e.g. Check the method mark in part (b) against the scheme' : 'e.g. Good method — watch the sign in the last line'
            }
          />
          <p id={`${noteId}-count`} className="m-0 text-right text-xs text-[var(--ec-text-faint)]">
            {note.length}/{MAX_REASONING_NOTE_CHARS}
          </p>
        </div>
      ) : null}

      {decision === 'confirm' || decision === 'override' ? (
        <label className="ms-review-console__visible">
          <input
            type="checkbox"
            checked={studentVisible}
            onChange={(e) => setStudentVisible(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--ec-brand)]"
            aria-describedby={`${id}-visible-help`}
          />
          <span>
            Tell {studentFirstName}
            {note.trim() ? ' and show them the note' : ''}
            <span id={`${id}-visible-help`} className="block text-xs text-[var(--ec-text-faint)]">
              {decision === 'override'
                ? 'Their mark changes either way — this decides whether they are told why.'
                : 'They get a notification that you checked their mark.'}
            </span>
          </span>
        </label>
      ) : null}

      {error ? <FormErrorAlert message={error.message} /> : null}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {saved && !saving ? (
        <p className="m-0 text-sm font-semibold text-[var(--ec-brand)]" aria-hidden>
          {DECISION_LABEL[saved]} — saved.
        </p>
      ) : null}

      <div className="ms-review-console__actions">
        <Button
          type="button"
          size="lg"
          fullWidth
          onClick={() => void save()}
          disabled={!decision || saving || saved === decision}
          loading={saving}
          loadingText="Saving…"
        >
          {saved && saved === decision ? 'Saved' : saveLabel}
        </Button>
      </div>

      {nav.nextHref ? (
        <label className="ms-review-console__visible">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => {
              setAutoNext(e.target.checked)
              writeAutoNext(e.target.checked)
            }}
            className="h-5 w-5 shrink-0 accent-[var(--ec-brand)]"
          />
          <span>Open the next script after saving</span>
        </label>
      ) : null}

      <nav className="ms-review-console__nav" aria-label="Scripts in this list">
        {nav.prevHref ? (
          <LoadingLink href={nav.prevHref} variant="inline" className="inline-flex min-h-[44px] items-center text-sm font-semibold">
            &larr; Previous
          </LoadingLink>
        ) : (
          <LoadingLink href={nav.inboxHref} variant="inline" className="inline-flex min-h-[44px] items-center text-sm font-semibold">
            &larr; All scripts
          </LoadingLink>
        )}
        {position ? (
          <span className="inline-flex min-h-[44px] items-center font-mono text-xs text-[var(--ec-text-secondary)]">{position}</span>
        ) : null}
        {nav.nextHref ? (
          <LoadingLink
            ref={nextLink}
            href={nav.nextHref}
            variant="inline"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold"
          >
            Next &rarr;
          </LoadingLink>
        ) : (
          <LoadingLink href={nav.inboxHref} variant="inline" className="inline-flex min-h-[44px] items-center text-sm font-semibold">
            Back to the list
          </LoadingLink>
        )}
      </nav>
    </aside>
  )
}
