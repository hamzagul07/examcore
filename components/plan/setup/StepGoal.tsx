'use client'

/**
 * Step 4 — the goal. Three modes as cards (one radiogroup, so arrow keys
 * move between them), a private target grade, and the opt-in morning
 * check-in with its time under the tick box — asked here, where the email
 * is chosen, and only once it is. The target grade is motivation the
 * student keeps to themselves; it is stored and never turned into a
 * promise in copy.
 */

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MODE_BLURB, MODE_LABEL, MODE_SUITS } from '@/lib/plan/modes'
import { ROADMAP_MODES, type RoadmapMode } from '@/lib/plan/roadmap-types'
import { TARGET_GRADE_MAX, type WizardAction, type WizardIssue, type WizardState } from '@/lib/plan/wizard-state'
import { FieldIssues, StepHeader, TimeInput, hasIssue } from '@/components/plan/setup/bits'

type Props = {
  state: WizardState
  dispatch: (action: WizardAction) => void
  issues: WizardIssue[]
  disabled?: boolean
}

export function StepGoal({ state, dispatch, issues, disabled }: Props) {
  return (
    <div className="ms-rm-setup-body">
      <StepHeader
        eyebrow="Step 4 of 5 · Goal"
        title="How should the plan spend your time?"
        lead="Pick the style that fits where you are. You can change it later without losing anything."
      />

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline" id="rm-mode-label">
          Roadmap mode
        </legend>
        <SegmentedControl<RoadmapMode>
          value={state.mode}
          onChange={(mode) => dispatch({ type: 'set_mode', mode })}
          aria-labelledby="rm-mode-label"
          className="ms-rm-setup-modes"
          optionClassName="ms-rm-setup-mode"
          disabled={disabled}
          options={ROADMAP_MODES.map((m) => ({
            value: m,
            label: (
              <span className="ms-rm-setup-mode__inner">
                <span className="ms-rm-setup-mode__name">{MODE_LABEL[m]}</span>
                <span className="ms-rm-setup-mode__blurb">{MODE_BLURB[m]}</span>
                <span className="ms-rm-setup-mode__suits">{MODE_SUITS[m]}</span>
              </span>
            ),
          }))}
        />
      </fieldset>

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Target grade (optional)</legend>
        <div className="ms-rm-setup-inline">
          <input
            id="rm-target-grade"
            type="text"
            className="ec-input ms-rm-setup-grade"
            value={state.targetGrade}
            maxLength={TARGET_GRADE_MAX}
            disabled={disabled}
            autoComplete="off"
            placeholder="A, 7, B…"
            aria-label="Target grade"
            aria-invalid={hasIssue(issues, 'targetGrade') || undefined}
            aria-describedby="rm-target-grade-note"
            onChange={(e) => dispatch({ type: 'set_target_grade', targetGrade: e.target.value })}
          />
          <span id="rm-target-grade-note" className="text-caption">
            Only you see this.
          </span>
        </div>
        <FieldIssues issues={issues} field="targetGrade" />
      </fieldset>

      <fieldset className="ms-plan-fieldset">
        <label className="ms-plan-check">
          <input
            type="checkbox"
            checked={state.remindMe}
            disabled={disabled}
            onChange={(e) => dispatch({ type: 'set_remind_me', remindMe: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Email me each morning with the day&apos;s blocks</span>
            <span className="text-caption block">
              One short email on study days, none on rest days. Switch it off any time from the email or your account.
            </span>
          </span>
        </label>
        {state.remindMe ? (
          <div className="ms-rm-setup-inline ms-rm-setup-reminder">
            <label htmlFor="rm-reminder" className="ms-rm-setup-sublabel">
              Send it at
            </label>
            <TimeInput
              id="rm-reminder"
              label="Reminder time"
              value={state.reminderTime}
              disabled={disabled}
              invalid={hasIssue(issues, 'reminderTime')}
              describedBy="rm-reminder-note"
              onChange={(time) => dispatch({ type: 'set_reminder_time', time })}
            />
            <span id="rm-reminder-note" className="text-caption">
              In your plan&apos;s time zone.
            </span>
          </div>
        ) : null}
        <FieldIssues issues={issues} field="reminderTime" />
      </fieldset>
    </div>
  )
}
