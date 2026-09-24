'use client'

/**
 * Step 5 — does the work fit the time? The assembled request goes to
 * POST /api/plan with `preview: true` on mount and after every edit here
 * (debounced, the previous request aborted), and the answer is shown as a
 * FeasibilityCard. No build happens until the student says so.
 *
 * There is one way to build: the nav's primary button. The engine's other
 * options — more time, one subject first, a different style — are offered
 * as "change the plan first" buttons, and only when there is more than the
 * one answer; a question with a single answer is not a question, and a
 * "keep it" button beside "Build" made a stressed student wonder what the
 * other answers were.
 *
 * Offline is a state, not an error: the step says it will build when the
 * connection is back and listens for it. While a preview or a build is in
 * flight the card is a skeleton of a few block rows, never a spinner over
 * an empty page.
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorBox } from '@/components/AuthFormBits'
import { FeasibilityCard } from '@/components/plan/FeasibilityCard'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import type { FeasibilityOption, FeasibilityReport, RoadmapBuildRequest } from '@/lib/plan/roadmap-types'
import type { SetupSubjectOption, WizardAction, WizardState } from '@/lib/plan/wizard-state'
import { StepHeader } from '@/components/plan/setup/bits'

export const OFFLINE_LINE = "You're offline — we'll build it when you're back."
export const LAYING_OUT_LINE = 'Laying out your days…'
const PREVIEW_DEBOUNCE_MS = 400
const GENERIC_ERROR = "We couldn't check the plan just now. Try again in a moment."

export const OPTION_LABEL: Record<Exclude<FeasibilityOption, 'keep'>, string> = {
  add_time: 'Add 30 min a day',
  prioritise_subject: 'Put one subject first',
  change_mode: 'Choose a different style',
}
export const OPTIONS_LEGEND = 'Or change the plan first'
export const HAPPY_LINE = 'Happy with it? Build it as it is.'
const FALLBACK_OPTIONS: FeasibilityOption[] = ['add_time', 'prioritise_subject', 'change_mode']

type Alternative = Exclude<FeasibilityOption, 'keep'>

/** The report's options minus the one the nav already owns; nothing to show when only "keep" was offered. */
export function alternativesFor(options: FeasibilityOption[] | undefined): Alternative[] {
  const source = options?.length ? options : FALLBACK_OPTIONS
  return source.filter((o): o is Alternative => o !== 'keep')
}

type PreviewState =
  | { status: 'loading'; report: FeasibilityReport | null }
  | { status: 'ready'; report: FeasibilityReport }
  | { status: 'error'; message: string; report: FeasibilityReport | null }
  | { status: 'offline'; report: FeasibilityReport | null }

type Props = {
  state: WizardState
  dispatch: (action: WizardAction) => void
  request: RoadmapBuildRequest
  subjectOptions: SetupSubjectOption[]
  building: boolean
  buildError: string
  onOption: (option: FeasibilityOption) => void
}

/** Two to four block rows, shimmering, with the one line that says what is happening. */
export function LayingOut({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ms-rm-setup-skeleton" role="status" aria-live="polite">
      <p className="ms-rm-setup-skeleton__line">{LAYING_OUT_LINE}</p>
      {Array.from({ length: Math.max(2, Math.min(4, rows)) }, (_, i) => (
        <div key={i} className="ms-rm-setup-skeleton__row ec-skeleton-shimmer" aria-hidden>
          <span className="ms-rm-setup-skeleton__min" />
          <span className="ms-rm-setup-skeleton__label" style={{ width: `${62 - i * 9}%` }} />
        </div>
      ))}
    </div>
  )
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function StepFeasibility({ state, dispatch, request, subjectOptions, building, buildError, onOption }: Props) {
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading', report: null })
  const [pickingSubject, setPickingSubject] = useState(false)
  // Re-run when the connection returns, and after a failed attempt on request.
  const [attempt, setAttempt] = useState(0)
  const lastReport = useRef<FeasibilityReport | null>(null)
  // One activation beacon per visit to this step, not one per debounced edit.
  const generatedTracked = useRef(false)
  const requestKey = JSON.stringify(request)

  useEffect(() => {
    const onOnline = () => setAttempt((n) => n + 1)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    if (isOffline()) {
      setPreview({ status: 'offline', report: lastReport.current })
      return
    }
    const controller = new AbortController()
    setPreview({ status: 'loading', report: lastReport.current })
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...(JSON.parse(requestKey) as RoadmapBuildRequest), preview: true }),
          signal: controller.signal,
        })
        const data = (await res.json().catch(() => ({}))) as { feasibility?: FeasibilityReport | null; error?: string }
        if (controller.signal.aborted) return
        if (!res.ok || !data.feasibility) {
          setPreview({ status: 'error', message: data.error || GENERIC_ERROR, report: lastReport.current })
          return
        }
        lastReport.current = data.feasibility
        setPreview({ status: 'ready', report: data.feasibility })
        if (!generatedTracked.current) {
          generatedTracked.current = true
          trackFunnelEvent('roadmap_generated', { subject: request.subjects[0] ?? null, source: data.feasibility.state })
        }
      } catch {
        if (controller.signal.aborted) return
        if (isOffline()) setPreview({ status: 'offline', report: lastReport.current })
        else setPreview({ status: 'error', message: GENERIC_ERROR, report: lastReport.current })
      }
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
    // requestKey stands in for request; a new key is a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, attempt])

  const report = preview.report
  const alternatives = alternativesFor(report?.options)
  const busy = building || preview.status === 'loading'

  function choose(option: Alternative) {
    if (option === 'prioritise_subject') {
      setPickingSubject((v) => !v)
      return
    }
    onOption(option)
  }

  return (
    <div className="ms-rm-setup-body">
      <StepHeader
        eyebrow="Step 5 of 5 · Feasibility"
        title="Does it fit?"
        lead="What the time you gave can hold, subject by subject, before anything is saved."
      />

      {building ? (
        <LayingOut rows={4} />
      ) : preview.status === 'offline' ? (
        <div className="ms-rm-setup-offline" role="status" aria-live="polite">
          <p>{OFFLINE_LINE}</p>
          {report ? <FeasibilityCard report={report} /> : null}
        </div>
      ) : preview.status === 'loading' && !report ? (
        <LayingOut rows={3} />
      ) : (
        <>
          {preview.status === 'error' ? <ErrorBox message={preview.message} /> : null}
          {report ? (
            <div className={preview.status === 'loading' ? 'ms-rm-setup-stale' : undefined} aria-busy={preview.status === 'loading' || undefined}>
              <FeasibilityCard report={report} />
            </div>
          ) : null}
          {preview.status === 'error' ? (
            <button type="button" className="ec-pill mt-2" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          ) : null}
        </>
      )}

      {report && !building && alternatives.length > 0 ? (
        <fieldset className="ms-plan-fieldset mt-6">
          <legend className="label-overline">{OPTIONS_LEGEND}</legend>
          <div className="ms-rm-setup-options">
            {alternatives.map((o) => (
              <button
                key={o}
                type="button"
                className={`ms-rm-setup-option ${o === 'prioritise_subject' && pickingSubject ? 'is-open' : ''}`.trim()}
                disabled={busy}
                aria-expanded={o === 'prioritise_subject' ? pickingSubject : undefined}
                onClick={() => choose(o)}
              >
                {OPTION_LABEL[o]}
                {o === 'add_time' ? <span className="ms-rm-setup-option__sub">on weekdays and weekends</span> : null}
                {o === 'prioritise_subject' && state.prioritySubject ? (
                  <span className="ms-rm-setup-option__sub">
                    {subjectOptions.find((s) => s.code === state.prioritySubject)?.label ?? state.prioritySubject} first
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {pickingSubject ? (
            <div className="ms-rm-setup-priority" role="group" aria-label="Subject to prioritise">
              <p className="text-caption mb-2">Its priority topics are placed before the other subjects&apos;.</p>
              <div className="ms-rm-setup-chips">
                {state.subjects.map((code) => {
                  const on = state.prioritySubject === code
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`ec-pill ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => dispatch({ type: 'set_priority_subject', code: on ? null : code })}
                    >
                      {subjectOptions.find((s) => s.code === code)?.label ?? code}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {report && !building && report.state === 'on_track' ? <p className="ms-rm-setup-happy">{HAPPY_LINE}</p> : null}

      {buildError ? <ErrorBox message={buildError} /> : null}
    </div>
  )
}
