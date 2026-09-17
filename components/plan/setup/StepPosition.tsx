'use client'

/**
 * Step 2 — where the student is, in their own words, one subject at a time.
 * Marked work speaks first when there is enough of it (three attempts) and
 * pre-selects the rating; one or two attempts are named as "not enough to go
 * on" rather than turned into a verdict. The rating is a prior for the
 * engine, never a judgement, and the copy says so.
 */

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SELF_RATINGS, SELF_RATING_LABEL, type SelfRating } from '@/lib/plan/roadmap-types'
import type { SetupProfile, SetupSubjectOption, WizardAction, WizardIssue, WizardState } from '@/lib/plan/wizard-state'
import { FieldIssues, StepHeader, hasIssue } from '@/components/plan/setup/bits'

type Props = {
  state: WizardState
  dispatch: (action: WizardAction) => void
  issues: WizardIssue[]
  profile: SetupProfile
  subjectOptions: SetupSubjectOption[]
  disabled?: boolean
}

function MeasuredLine({ label, measured }: { label: string; measured: { pct: number; attempts: number } | undefined }) {
  if (!measured || measured.attempts === 0) return null
  if (measured.attempts >= 3) {
    return (
      <p className="ms-rm-setup-measured">
        Your marked work puts you at <strong>{Math.round(measured.pct)}%</strong> in {label}.
      </p>
    )
  }
  return (
    <p className="ms-rm-setup-measured">
      You&apos;ve marked {measured.attempts} {measured.attempts === 1 ? 'answer' : 'answers'} in {label} — not enough to go on yet.
    </p>
  )
}

export function StepPosition({ state, dispatch, issues, profile, subjectOptions, disabled }: Props) {
  return (
    <div className="ms-rm-setup-body">
      <StepHeader
        eyebrow="Step 2 of 5 · Current position"
        title="Honestly, where are you?"
        lead="A starting point, not a verdict. Each topic gets a short diagnostic first, and your marked answers take over from there."
      />

      {state.subjects.map((code) => {
        const label = subjectOptions.find((o) => o.code === code)?.label ?? code
        const field = `rating:${code}`
        const labelId = `rm-rating-${code}-label`
        return (
          <fieldset key={code} className="ms-plan-fieldset ms-rm-setup-rating">
            <legend className="label-overline" id={labelId}>
              {label}
            </legend>
            <MeasuredLine label={label} measured={profile.measured?.[code]} />
            <SegmentedControl<SelfRating>
              value={state.selfRatings[code] ?? null}
              onChange={(rating) => dispatch({ type: 'set_rating', code, rating })}
              aria-labelledby={labelId}
              aria-describedby={hasIssue(issues, field) ? `rm-issue-${field}` : undefined}
              className="ms-plan-segments"
              optionClassName="ms-plan-segment"
              disabled={disabled}
              options={SELF_RATINGS.map((r) => ({ value: r, label: SELF_RATING_LABEL[r] }))}
            />
            <FieldIssues issues={issues} field={field} id={`rm-issue-${field}`} />
          </fieldset>
        )
      })}
    </div>
  )
}
