'use client'

/**
 * Step 1 — the finish line. Board and qualification are read from the
 * profile and shown, not asked again; subjects, a paper per subject where
 * the catalogue knows them, a date and an optional start time per paper,
 * and the zone the plan's clock runs in.
 *
 * The zone is a text field with a datalist of every zone the browser knows,
 * so a typo is caught the moment the field is left, not on Next. The note
 * under it says where the value came from — the device or the account —
 * and offers the device's zone back in one tap when they differ. Both are
 * read after mount: the server does not know the student's device.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import { planLength } from '@/lib/plan/build-study-plan'
import { formatPlanDate } from '@/lib/plan/plan-view'
import {
  MAX_SUBJECTS,
  browserTimeZone,
  planExamDate,
  supportedTimeZones,
  timeZoneIssue,
  timeZoneSource,
  type SetupProfile,
  type SetupSubjectOption,
  type WizardAction,
  type WizardIssue,
  type WizardState,
} from '@/lib/plan/wizard-state'
import { Chips, FieldIssues, StepHeader, TimeInput, hasIssue } from '@/components/plan/setup/bits'

type Props = {
  state: WizardState
  dispatch: (action: WizardAction) => void
  issues: WizardIssue[]
  profile: SetupProfile
  subjectOptions: SetupSubjectOption[]
  todayIso: string
  disabled?: boolean
}

const ZONE_LIST_ID = 'rm-zones'

export function StepFinishLine({ state, dispatch, issues, profile, subjectOptions, todayIso, disabled }: Props) {
  const suggestions = useMemo(() => suggestedExamDates(), [])
  // Device zone and the datalist are the browser's answer, so they are read once mounted; the server renders neither.
  const [deviceZone, setDeviceZone] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [zoneTouched, setZoneTouched] = useState(false)
  useEffect(() => {
    setDeviceZone(browserTimeZone())
    setZones(supportedTimeZones([profile.timeZone ?? '']))
  }, [profile.timeZone])
  const zoneSource = deviceZone ? timeZoneSource(state.timeZone, deviceZone, profile.timeZone) : null
  // The step's own list only fills once Next was tried; until then a blurred field checks itself.
  const zoneIssues = useMemo(() => {
    if (hasIssue(issues, 'timeZone') || !zoneTouched) return issues
    const own = timeZoneIssue(state.timeZone)
    return own ? [...issues, own] : issues
  }, [issues, zoneTouched, state.timeZone])
  const zoneInvalid = hasIssue(zoneIssues, 'timeZone')
  const optionFor = (code: string) => subjectOptions.find((o) => o.code === code)
  const latest = planExamDate(state)
  const daysLeft = latest ? planLength(todayIso, latest) : 0

  return (
    <div className="ms-rm-setup-body">
      <StepHeader
        eyebrow="Step 1 of 5 · Finish line"
        title="Let's start with what's ahead."
        lead="The papers you sit and when. Everything else counts back from here."
      />

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Board and qualification</legend>
        <p className="ms-rm-setup-readonly">
          <span>
            {profile.board || 'Board not set'}
            {profile.level ? ` · ${profile.level}` : ''}
          </span>
          <Link href="/account/study" className="ms-rm-setup-link">
            Change in settings
          </Link>
        </p>
      </fieldset>

      <fieldset className="ms-plan-fieldset" aria-describedby={hasIssue(issues, 'subjects') ? 'rm-issue-subjects' : undefined}>
        <legend className="label-overline">Subjects on this exam run</legend>
        <p className="text-caption mb-2">Up to {MAX_SUBJECTS}. Each one gets its own paper date below.</p>
        <Chips
          label="Subjects"
          disabled={disabled}
          selected={state.subjects}
          options={subjectOptions.map((o) => ({
            value: o.code,
            label: o.label,
            disabled: !state.subjects.includes(o.code) && state.subjects.length >= MAX_SUBJECTS,
          }))}
          onToggle={(code) => dispatch({ type: 'toggle_subject', code })}
        />
        <FieldIssues issues={issues} field="subjects" id="rm-issue-subjects" />
      </fieldset>

      {state.subjects.length > 0 ? (
        <fieldset className="ms-plan-fieldset">
          <legend className="label-overline">Exam dates</legend>
          <p className="text-caption mb-2">
            {state.subjects.length > 1 ? 'Set every subject to a session, then adjust any that differ.' : 'Pick a session, or the exact date.'}
          </p>
          <Chips
            label="Exam session, applied to every subject"
            disabled={disabled}
            selected={state.subjects.every((c) => state.examDates[c] === state.examDates[state.subjects[0]!]) ? [state.examDates[state.subjects[0]!] ?? ''] : []}
            options={suggestions.map((s) => ({ value: s.value, label: s.label, title: formatPlanDate(s.value) }))}
            onToggle={(date) => dispatch({ type: 'set_all_exam_dates', date })}
          />

          <ul className="ms-rm-setup-exams">
            {state.subjects.map((code) => {
              const option = optionFor(code)
              const label = option?.label ?? code
              const dateField = `examDate:${code}`
              const timeField = `examTime:${code}`
              const components = option?.components ?? []
              return (
                <li key={code} className="ms-rm-setup-exam">
                  <div className="ms-rm-setup-exam__name">{label}</div>
                  <div className="ms-rm-setup-exam__fields">
                    {components.length > 0 ? (
                      <label className="ms-rm-setup-field">
                        <span className="text-caption">Paper</span>
                        <select
                          className="ms-plan-week__select ms-rm-setup-select"
                          value={state.components[code] ?? ''}
                          disabled={disabled}
                          onChange={(e) => dispatch({ type: 'set_component', code, component: e.target.value })}
                        >
                          <option value="">Any paper</option>
                          {components.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="ms-rm-setup-field">
                      <span className="text-caption">Date</span>
                      <input
                        type="date"
                        className="ec-input ms-rm-setup-date"
                        value={state.examDates[code] ?? ''}
                        min={todayIso}
                        disabled={disabled}
                        aria-invalid={hasIssue(issues, dateField) || undefined}
                        aria-describedby={hasIssue(issues, dateField) ? `rm-issue-${dateField}` : undefined}
                        onChange={(e) => dispatch({ type: 'set_exam_date', code, date: e.target.value })}
                      />
                    </label>
                    <label className="ms-rm-setup-field">
                      <span className="text-caption">Starts (optional)</span>
                      <TimeInput
                        id={`rm-exam-time-${code}`}
                        label={`${label} exam start time`}
                        value={state.examTimes[code] ?? ''}
                        disabled={disabled}
                        invalid={hasIssue(issues, timeField)}
                        onChange={(time) => dispatch({ type: 'set_exam_time', code, time })}
                      />
                    </label>
                  </div>
                  <FieldIssues issues={issues} field={dateField} id={`rm-issue-${dateField}`} />
                  <FieldIssues issues={issues} field={timeField} />
                </li>
              )
            })}
          </ul>
          {latest ? (
            <p className="ms-plan-note mt-2" aria-live="polite">
              {daysLeft > 1 ? (
                <>
                  The plan runs to <strong>{formatPlanDate(latest)}</strong> — {daysLeft} days from today.
                </>
              ) : daysLeft === 1 ? (
                'The last paper is tomorrow.'
              ) : (
                'That date has passed.'
              )}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Time zone</legend>
        <p className="text-caption mb-2">Your plan&apos;s clock runs in this zone. Change it only if you&apos;ll be studying somewhere else.</p>
        <input
          type="text"
          className="ec-input ms-rm-setup-zone"
          value={state.timeZone}
          list={ZONE_LIST_ID}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Time zone"
          aria-invalid={zoneInvalid || undefined}
          aria-describedby={zoneInvalid ? 'rm-issue-timeZone' : zoneSource ? 'rm-zone-source' : undefined}
          onChange={(e) => dispatch({ type: 'set_time_zone', timeZone: e.target.value.trim() })}
          onBlur={() => setZoneTouched(true)}
        />
        <datalist id={ZONE_LIST_ID}>
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <FieldIssues issues={zoneIssues} field="timeZone" id="rm-issue-timeZone" />
        {zoneSource ? (
          <p id="rm-zone-source" className="ms-rm-setup-zone-source">
            {zoneSource === 'device' ? (
              'From your device'
            ) : (
              <>
                {zoneSource === 'account' ? <span>From your account settings · </span> : null}
                <button
                  type="button"
                  className="ms-rm-setup-linkbtn"
                  disabled={disabled}
                  onClick={() => {
                    dispatch({ type: 'set_time_zone', timeZone: deviceZone })
                    setZoneTouched(true)
                  }}
                >
                  Use my device&apos;s zone ({deviceZone})
                </button>
              </>
            )}
          </p>
        ) : null}
      </fieldset>
    </div>
  )
}
