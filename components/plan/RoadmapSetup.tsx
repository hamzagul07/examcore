'use client'

/**
 * The roadmap's guided setup: five steps in three to five minutes, prefilled
 * from the profile and any plan the student already has. One reducer
 * (lib/plan/wizard-state.ts) holds every answer; this component only moves
 * between steps, validates on the way forward, and talks to /api/plan.
 *
 * The feasibility step is the one place a request leaves the browser
 * before the build, and it never saves. The build itself returns the saved
 * plan, its task state and revision, handed to the screen through onBuilt.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { clearTodayCache } from '@/components/plan/roadmap-client'
import { isoDate, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import type { RoadmapPlan } from '@/lib/plan/roadmap-view'
import type { FeasibilityOption, FeasibilityReport, TaskState } from '@/lib/plan/roadmap-types'
import {
  ADD_TIME_STEP,
  initialWizardState,
  planExamDate,
  toRequest,
  validateStep,
  wizardReducer,
  type SetupProfile,
  type SetupStep,
  type SetupSubjectOption,
} from '@/lib/plan/wizard-state'
import { Stepper } from '@/components/plan/setup/Stepper'
import { IssueSummary } from '@/components/plan/setup/bits'
import { StepFinishLine } from '@/components/plan/setup/StepFinishLine'
import { StepPosition } from '@/components/plan/setup/StepPosition'
import { StepAvailability } from '@/components/plan/setup/StepAvailability'
import { StepGoal } from '@/components/plan/setup/StepGoal'
import { OFFLINE_LINE, StepFeasibility } from '@/components/plan/setup/StepFeasibility'

export type { SetupProfile, SetupSubjectOption } from '@/lib/plan/wizard-state'

export type SetupSaved = {
  plan: HydratedPlan
  done: DoneDays
  taskState: TaskState
  revision: number
  feasibility?: FeasibilityReport | null
}

type Props = {
  subjectOptions: SetupSubjectOption[]
  profile: SetupProfile
  prior: RoadmapPlan | null
  onBuilt: (saved: SetupSaved) => void
  onCancel?: () => void
}

const STARTED_KEY = 'ms_roadmap_started'
const BUILD_ERROR = "We couldn't build your roadmap just now. Try again in a moment."

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function RoadmapSetup({ subjectOptions, profile, prior, onBuilt, onCancel }: Props) {
  // Rendered on the server too: start from the UTC date both sides agree on
  // and switch to the browser's own date once mounted.
  const [todayIso, setTodayIso] = useState(() => isoDate(new Date()))
  const [state, dispatch] = useReducer(wizardReducer, null, () =>
    initialWizardState(profile, prior, { timeZone: profile.timeZone })
  )
  const [attempted, setAttempted] = useState<Partial<Record<SetupStep, boolean>>>({})
  const [reached, setReached] = useState<SetupStep>(1)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTodayIso(isoDate(new Date(), true))
    if (!profile.timeZone) dispatch({ type: 'set_time_zone', timeZone: browserTimeZone() })
    try {
      if (sessionStorage.getItem(STARTED_KEY) !== '1') {
        sessionStorage.setItem(STARTED_KEY, '1')
        trackFunnelEvent('roadmap_started', { subject: profile.subjectCodes[0] ?? null })
      }
    } catch {
      trackFunnelEvent('roadmap_started', { subject: profile.subjectCodes[0] ?? null })
    }
    // Mount only: the profile is a snapshot, and re-running would overwrite a zone the student has edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const labels = useMemo(() => Object.fromEntries(subjectOptions.map((o) => [o.code, o.label])), [subjectOptions])
  const issues = useMemo(
    () => (attempted[state.step] ? validateStep(state, state.step, todayIso, labels) : []),
    [attempted, state, todayIso, labels]
  )
  const request = useMemo(() => toRequest(state, todayIso), [state, todayIso])

  const go = useCallback(
    (step: SetupStep) => {
      dispatch({ type: 'go', step })
      setBuildError('')
      // The stepper is the landmark; a long step three should not leave the student mid-page.
      window.requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }))
    },
    []
  )

  function next() {
    const problems = validateStep(state, state.step, todayIso, labels)
    setAttempted((a) => ({ ...a, [state.step]: true }))
    if (problems.length > 0) return
    const target = Math.min(5, state.step + 1) as SetupStep
    setReached((r) => (target > r ? target : r))
    go(target)
  }

  function back() {
    if (state.step === 1) {
      onCancel?.()
      return
    }
    go((state.step - 1) as SetupStep)
  }

  function onOption(option: FeasibilityOption) {
    if (option === 'add_time') {
      dispatch({ type: 'add_minutes', minutes: ADD_TIME_STEP })
      go(3)
    } else if (option === 'change_mode') {
      go(4)
    }
  }

  async function build() {
    if (building) return
    setBuildError('')
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setBuildError(OFFLINE_LINE)
      return
    }
    setBuilding(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<SetupSaved> & { error?: string }
      if (!res.ok || !data.plan) {
        setBuildError(data.error || BUILD_ERROR)
        return
      }
      trackFunnelEvent('roadmap_accepted', { subject: request.subjects[0] ?? null, source: data.feasibility?.state ?? null })
      // The Study Mode chip and the /mark card must not keep a "no plan" answer now that there is one.
      clearTodayCache()
      onBuilt({
        plan: data.plan,
        done: data.done ?? {},
        taskState: data.taskState ?? {},
        revision: data.revision ?? 1,
        feasibility: data.feasibility ?? null,
      })
    } catch {
      setBuildError(typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE_LINE : 'Network error — check your connection and try again.')
    } finally {
      setBuilding(false)
    }
  }

  const step = state.step
  const stepProps = { state, dispatch, issues, disabled: building }

  return (
    <form
      className="ms-rm-setup"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (step === 5) void build()
        else next()
      }}
    >
      <div ref={topRef} className="ms-rm-setup-top">
        <p className="ec-eyebrow">{prior ? 'Adjust your roadmap' : 'Your exam roadmap'}</p>
        <Stepper current={step} reached={reached} onGo={go} disabled={building} />
      </div>

      {step === 1 ? (
        <StepFinishLine {...stepProps} profile={profile} subjectOptions={subjectOptions} todayIso={todayIso} />
      ) : step === 2 ? (
        <StepPosition {...stepProps} profile={profile} subjectOptions={subjectOptions} />
      ) : step === 3 ? (
        <StepAvailability {...stepProps} todayIso={todayIso} examDate={planExamDate(state)} />
      ) : step === 4 ? (
        <StepGoal {...stepProps} />
      ) : (
        <StepFeasibility
          state={state}
          dispatch={dispatch}
          request={request}
          subjectOptions={subjectOptions}
          building={building}
          buildError={buildError}
          onBuild={() => void build()}
          onOption={onOption}
        />
      )}

      <IssueSummary issues={issues} />

      <div className="ms-rm-setup-nav">
        <button type="button" className="ec-pill" onClick={back} disabled={building}>
          {step === 1 ? (onCancel ? 'Keep the current plan' : 'Back') : 'Back'}
        </button>
        {step < 5 ? (
          <Button type="submit" variant="primary" size="md" disabled={building}>
            Next
          </Button>
        ) : (
          <Button type="submit" variant="primary" size="md" isLoading={building} loadingText="Laying out your days…">
            {prior ? 'Rebuild my roadmap' : 'Build my roadmap'}
          </Button>
        )}
        {step === 5 && prior ? (
          <p className="text-caption">Rebuilding replaces the current plan. What you have done stays done.</p>
        ) : null}
      </div>
    </form>
  )
}
