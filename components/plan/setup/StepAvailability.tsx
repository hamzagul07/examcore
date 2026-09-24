'use client'

/**
 * Step 3 — real-life availability. Minutes on a weekday and at the weekend,
 * a Full / Half / None override per day, the windows the student would rather
 * study in, how long a focused block should be, and the fixed things
 * (tuition, sport, work) stay open: they change the plan most and differ
 * for everyone. Break rhythm, the span with no study at all, quiet hours
 * and days away sit under one "Fine-tune" fold — their defaults suit most
 * students, and on a phone the open step was three screens tall. The fold
 * opens itself when a prior plan set any of them or a message sits inside
 * it, so nothing the student chose or needs to fix is ever hidden. Every
 * answer here becomes a hard fact for the engine; none of them is a
 * suggestion. The reminder time lives on step four with the email it sets.
 */

import { useEffect, useState, type SyntheticEvent } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatMinutes, formatPlanDate } from '@/lib/plan/plan-view'
import {
  BREAK_MINUTES,
  COMMITMENT_KIND_LABEL,
  SESSION_LENGTHS,
  type BreakRhythm,
  type SessionLength,
  type Weekday,
} from '@/lib/plan/roadmap-types'
import {
  COMMITMENT_KINDS,
  DAY_LOAD_LABEL,
  FINE_TUNE_FIELDS,
  MAX_BLOCKED_DATES,
  MINUTE_CHOICES,
  WEEKDAY_SHORT,
  WINDOW_PRESET,
  WINDOW_PRESETS,
  dayMinutes,
  fineTuneDiffersFromDefaults,
  type DayType,
  type WindowPreset,
  type WizardAction,
  type WizardIssue,
  type WizardState,
} from '@/lib/plan/wizard-state'
import { Chips, FieldIssues, StepHeader, TimeSpan, hasIssue } from '@/components/plan/setup/bits'

type Props = {
  state: WizardState
  dispatch: (action: WizardAction) => void
  issues: WizardIssue[]
  todayIso: string
  examDate: string | null
  disabled?: boolean
}

const SESSION_MEANING: Record<SessionLength, string> = {
  20: 'Short bursts. Good for recall and quick questions — no timed papers or sets, questions one at a time.',
  40: 'One real question with time to mark it. Timed papers fit.',
  60: 'A long sitting. Papers and mixed practice; fewer, longer breaks.',
}

const BREAK_LABEL: Record<BreakRhythm, string> = { short: 'Short', standard: 'Standard', generous: 'Generous' }

const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

function WindowPicker({
  which,
  state,
  dispatch,
  issues,
  disabled,
}: {
  which: DayType
  state: WizardState
  dispatch: (action: WizardAction) => void
  issues: WizardIssue[]
  disabled?: boolean
}) {
  const choice = state.windows[which]
  const field = `window:${which}`
  const customOn = choice.custom !== null
  const title = which === 'weekday' ? 'Weekdays' : 'Weekends'
  return (
    <div className="ms-rm-setup-windows">
      <p className="ms-rm-setup-sublabel">{title}</p>
      <div className="ms-rm-setup-chips" role="group" aria-label={`${title}: preferred times`}>
        {WINDOW_PRESETS.map((p: WindowPreset) => {
          const on = choice.presets.includes(p)
          return (
            <button
              key={p}
              type="button"
              className={`ec-pill ${on ? 'is-on' : ''}`}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => dispatch({ type: 'toggle_window', which, preset: p })}
            >
              {WINDOW_PRESET[p].label}
              <span className="ms-rm-setup-chip-sub">
                {WINDOW_PRESET[p].start}–{WINDOW_PRESET[p].end}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          className={`ec-pill ${customOn ? 'is-on' : ''}`}
          aria-pressed={customOn}
          disabled={disabled}
          onClick={() => dispatch({ type: 'set_custom_window', which, window: customOn ? null : { start: '19:00', end: '21:00' } })}
        >
          Custom
        </button>
      </div>
      {customOn && choice.custom ? (
        <TimeSpan
          idBase={`rm-window-${which}`}
          label={`${title} custom window`}
          start={choice.custom.start}
          end={choice.custom.end}
          disabled={disabled}
          invalid={hasIssue(issues, field)}
          onChange={(w) => dispatch({ type: 'set_custom_window', which, window: w })}
        />
      ) : null}
      <FieldIssues issues={issues} field={field} />
    </div>
  )
}

export const FINE_TUNE_SUMMARY = 'Fine-tune (breaks, sleep, quiet hours, days away) — defaults are sensible'

export function StepAvailability({ state, dispatch, issues, todayIso, examDate, disabled }: Props) {
  const [blockInput, setBlockInput] = useState('')
  const minutes = dayMinutes(state)
  const breaks = BREAK_MINUTES[state.breakRhythm]
  // Open from the start when a prior plan changed something inside; opened again whenever a message lands there.
  const [moreOpen, setMoreOpen] = useState(() => fineTuneDiffersFromDefaults(state))
  const issueInside = issues.some((i) => FINE_TUNE_FIELDS.includes(i.field))
  useEffect(() => {
    if (issueInside) setMoreOpen(true)
  }, [issueInside])

  function addBlocked() {
    if (!blockInput) return
    dispatch({ type: 'add_blocked_date', date: blockInput })
    setBlockInput('')
  }

  return (
    <div className="ms-rm-setup-body">
      <StepHeader
        eyebrow="Step 3 of 5 · Real-life availability"
        title="Build around your life — not an imaginary perfect week."
        lead="The plan is built inside what you tell us here — nothing is scheduled where you can't be. You can change any of it later."
      />

      <fieldset className="ms-plan-fieldset" aria-describedby={hasIssue(issues, 'minutes') ? 'rm-issue-minutes' : undefined}>
        <legend className="label-overline">Minutes on a normal day</legend>
        <p className="ms-rm-setup-sublabel">Weekday</p>
        <Chips
          label="Weekday minutes"
          disabled={disabled}
          selected={[state.weekdayMinutes]}
          options={MINUTE_CHOICES.map((m) => ({ value: m, label: formatMinutes(m) }))}
          onToggle={(m) => dispatch({ type: 'set_minutes', which: 'weekday', minutes: m })}
        />
        <p className="ms-rm-setup-sublabel mt-3">Weekend day</p>
        <Chips
          label="Weekend minutes"
          disabled={disabled}
          selected={[state.weekendMinutes]}
          options={MINUTE_CHOICES.map((m) => ({ value: m, label: formatMinutes(m) }))}
          onToggle={(m) => dispatch({ type: 'set_minutes', which: 'weekend', minutes: m })}
        />

        <p className="ms-rm-setup-sublabel mt-4">Days that differ</p>
        <p className="text-caption mb-2">Tap a day to cycle Full, Half, None.</p>
        <div className="ms-plan-week" role="group" aria-label="How much of your time each day">
          {WEEKDAYS.map((d) => {
            const load = state.dayLoads[d] ?? 'full'
            return (
              <div key={d} className="ms-plan-week__day">
                <span className="ms-plan-week__name" aria-hidden>
                  {WEEKDAY_SHORT[d]}
                </span>
                <button
                  type="button"
                  className={`ms-rm-setup-load is-${load}`}
                  disabled={disabled}
                  aria-label={`${WEEKDAY_SHORT[d]}: ${DAY_LOAD_LABEL[load]}, ${minutes[d]} minutes. Tap to change.`}
                  onClick={() => dispatch({ type: 'cycle_day_load', day: d })}
                >
                  {DAY_LOAD_LABEL[load]}
                </button>
                <span className="ms-plan-week__min" aria-hidden>
                  {minutes[d] || '—'}
                </span>
              </div>
            )
          })}
        </div>
        <FieldIssues issues={issues} field="minutes" id="rm-issue-minutes" />
      </fieldset>

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">When you would rather study</legend>
        <p className="text-caption mb-3">Blocks are placed inside these. Pick more than one if it varies.</p>
        <WindowPicker which="weekday" state={state} dispatch={dispatch} issues={issues} disabled={disabled} />
        <WindowPicker which="weekend" state={state} dispatch={dispatch} issues={issues} disabled={disabled} />
      </fieldset>

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline" id="rm-session-label">
          Session length
        </legend>
        <SegmentedControl<`${SessionLength}`>
          value={`${state.sessionLength}`}
          onChange={(v) => dispatch({ type: 'set_session_length', sessionLength: Number(v) as SessionLength })}
          aria-labelledby="rm-session-label"
          className="ms-plan-segments"
          optionClassName="ms-plan-segment"
          disabled={disabled}
          options={SESSION_LENGTHS.map((s) => ({ value: `${s}` as `${SessionLength}`, label: `${s} min` }))}
        />
        <p className="text-caption mt-2 max-w-prose">{SESSION_MEANING[state.sessionLength]}</p>
      </fieldset>

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Fixed commitments</legend>
        <p className="text-caption mb-3">Tuition, school, sport, work. Nothing is scheduled inside them.</p>
        {state.commitments.length > 0 ? (
          <ul className="ms-rm-setup-commitments">
            {state.commitments.map((c) => {
              const field = `commitment:${c.id}`
              const invalid = hasIssue(issues, field)
              return (
                <li key={c.id} className="ms-rm-setup-commitment" aria-describedby={invalid ? `rm-issue-${field}` : undefined}>
                  <div className="ms-rm-setup-commitment__row">
                    <input
                      type="text"
                      className="ec-input ms-rm-setup-commitment__label"
                      placeholder="What is it"
                      value={c.label}
                      maxLength={40}
                      disabled={disabled}
                      aria-label="Commitment name"
                      aria-invalid={invalid || undefined}
                      onChange={(e) => dispatch({ type: 'update_commitment', id: c.id, patch: { label: e.target.value } })}
                    />
                    <select
                      className="ms-plan-week__select ms-rm-setup-select"
                      value={c.kind}
                      disabled={disabled}
                      aria-label="Kind of commitment"
                      onChange={(e) => dispatch({ type: 'update_commitment', id: c.id, patch: { kind: e.target.value as typeof c.kind } })}
                    >
                      {COMMITMENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {COMMITMENT_KIND_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Chips
                    label={`${c.label || 'Commitment'} days`}
                    className="ms-rm-setup-chips--days"
                    disabled={disabled}
                    selected={c.days}
                    options={WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))}
                    onToggle={(day) => dispatch({ type: 'toggle_commitment_day', id: c.id, day })}
                  />
                  <div className="ms-rm-setup-commitment__row">
                    <TimeSpan
                      idBase={`rm-commitment-${c.id}`}
                      label={`${c.label || 'Commitment'} time`}
                      start={c.start}
                      end={c.end}
                      disabled={disabled}
                      invalid={invalid}
                      onChange={(w) => dispatch({ type: 'update_commitment', id: c.id, patch: w })}
                    />
                    <button
                      type="button"
                      className="ec-pill ms-rm-setup-remove"
                      disabled={disabled}
                      onClick={() => dispatch({ type: 'remove_commitment', id: c.id })}
                    >
                      Remove
                    </button>
                  </div>
                  <FieldIssues issues={issues} field={field} id={`rm-issue-${field}`} />
                </li>
              )
            })}
          </ul>
        ) : null}
        <button type="button" className="ec-pill" disabled={disabled} onClick={() => dispatch({ type: 'add_commitment' })}>
          Add a commitment
        </button>
      </fieldset>

      <details
        className="ms-rm-setup-more"
        open={moreOpen}
        onToggle={(e: SyntheticEvent<HTMLDetailsElement>) => setMoreOpen(e.currentTarget.open)}
      >
        <summary className="ms-rm-setup-more__summary">{FINE_TUNE_SUMMARY}</summary>

        <fieldset className="ms-plan-fieldset">
          <legend className="label-overline" id="rm-break-label">
            Break rhythm
          </legend>
          <SegmentedControl<BreakRhythm>
            value={state.breakRhythm}
            onChange={(breakRhythm) => dispatch({ type: 'set_break_rhythm', breakRhythm })}
            aria-labelledby="rm-break-label"
            className="ms-plan-segments"
            optionClassName="ms-plan-segment"
            disabled={disabled}
            options={(['short', 'standard', 'generous'] as BreakRhythm[]).map((b) => ({
              value: b,
              label: `${BREAK_LABEL[b]} · ${BREAK_MINUTES[b].short}/${BREAK_MINUTES[b].long}`,
            }))}
          />
          <p className="text-caption mt-2">
            {breaks.short} minutes off between blocks, {breaks.long} after a few in a row.
          </p>
        </fieldset>

        <fieldset className="ms-plan-fieldset">
          <legend className="label-overline">No study at all</legend>
          <p className="text-caption mb-2">Sleep, mostly. This span may cross midnight.</p>
          <TimeSpan
            idBase="rm-nostudy"
            label="No-study span"
            start={state.noStudy.start}
            end={state.noStudy.end}
            disabled={disabled}
            invalid={hasIssue(issues, 'noStudy')}
            onChange={(w) => dispatch({ type: 'set_no_study', window: w })}
          />
          <FieldIssues issues={issues} field="noStudy" />
        </fieldset>

        <fieldset className="ms-plan-fieldset">
          <legend className="label-overline">Quiet hours</legend>
          <p className="text-caption mb-2">No nudges inside these hours.</p>
          <TimeSpan
            idBase="rm-quiet"
            label="Quiet hours"
            start={state.quietHours.start}
            end={state.quietHours.end}
            disabled={disabled}
            invalid={hasIssue(issues, 'quietHours')}
            onChange={(w) => dispatch({ type: 'set_quiet_hours', window: w })}
          />
          <FieldIssues issues={issues} field="quietHours" />
        </fieldset>

        <fieldset className="ms-plan-fieldset">
          <legend className="label-overline">Days you&apos;re away</legend>
          <p className="text-caption mb-3">A trip, a wedding, a school event. Nothing is scheduled on those days.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="ec-input ms-rm-setup-date"
              value={blockInput}
              min={todayIso}
              max={examDate ?? undefined}
              disabled={disabled || state.blockedDates.length >= MAX_BLOCKED_DATES}
              aria-label="A date you're away"
              onChange={(e) => setBlockInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addBlocked()
                }
              }}
            />
            <button type="button" className="ec-pill" disabled={disabled || !blockInput} onClick={addBlocked}>
              Add day
            </button>
          </div>
          {state.blockedDates.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Days away">
              {state.blockedDates.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    className="ec-pill is-on"
                    disabled={disabled}
                    aria-label={`Remove ${formatPlanDate(d)}`}
                    onClick={() => dispatch({ type: 'remove_blocked_date', date: d })}
                  >
                    {formatPlanDate(d)} ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </fieldset>
      </details>
    </div>
  )
}
